-- Online Listening — legitimacy backfill for pre-fix rows.
--
-- Auto-applied at app start by server/db-online-listening-backfill.ts.
-- This file remains the auditable record of the migration and can be
-- applied manually with:
--   psql "$DATABASE_URL" -f migrations/0011_online_listening_legitimacy_backfill.sql
-- If you edit either copy, update the other to match.
--
-- The Online Listening feature previously persisted mentions with fabricated
-- X/Twitter handles, hash-derived status IDs that 404, and a hardcoded
-- `is_verified = true` regardless of whether the URL ever resolved. The
-- branch that introduced this migration teaches the data-in path to refuse
-- hallucinated URLs, HEAD-probe news URLs, and tag every saved mention with
-- `metadata.provenance`. Rows that landed before the branch deployed are
-- not retroactively cleaned up by the application code, so this migration
-- backfills them.
--
-- Two passes:
--   1. Tag every legacy row (those without `metadata.provenance`) as
--      `is_verified = false` and add `provenance = 'unknown'`,
--      `legacy = true`, `metricsAreReal = false` to metadata. Existing
--      metadata keys (alertLevel, newsSource, articleTitle, etc.) are
--      preserved by the `||` jsonb merge — only the three new keys are
--      written.
--   2. Scrub `source_url` for X/Twitter URLs whose status ID is shorter
--      than 15 digits. Real X status IDs are 15–20 digits; anything
--      shorter was generated from `hashAbs(content)` by the old chi-demo
--      seeder. Setting these to NULL stops the UI from rendering a broken
--      external-link button. News URLs are left alone — even when 404,
--      they may resolve in the future or the user may want to verify
--      manually; the "Unverified" badge already conveys the uncertainty.
--
-- Idempotent: pass 1's WHERE clause filters out rows that already carry
-- a provenance tag. Pass 2 only updates rows whose source_url is still
-- non-null and matches the synthetic pattern, so re-running is a no-op.

BEGIN;

-- Pass 1: mark legacy rows as unverified + tag provenance/legacy/metricsAreReal.
UPDATE online_listening_mentions
SET
  is_verified = false,
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'provenance', 'unknown',
    'legacy', true,
    'metricsAreReal', false
  )
WHERE metadata->>'provenance' IS NULL;

-- Pass 2: scrub fabricated X/Twitter status URLs (status IDs < 15 digits).
UPDATE online_listening_mentions
SET source_url = NULL
WHERE metadata->>'provenance' = 'unknown'
  AND source_url IS NOT NULL
  AND source_url ~ '^https?://(twitter|x)\.com/[^/]+/status/[0-9]{1,14}$';

COMMIT;

-- Post-migration verification (run manually):
--
--   SELECT
--     metadata->>'provenance' AS provenance,
--     is_verified,
--     COUNT(*) AS row_count,
--     COUNT(*) FILTER (WHERE source_url IS NULL) AS null_url_count
--   FROM online_listening_mentions
--   GROUP BY 1, 2
--   ORDER BY 1, 2;
--
-- Expected after a single run on a database that previously held legacy rows:
--   - 'unknown' / false: all pre-fix rows, with synthetic X URLs nulled.
--   - 'demo_seed' / false: rows from the new chi-demo seeder (if applied
--     after this migration).
--   - 'newsapi_*' / 'google_news_rss' / true|false: rows from the news fetch
--     route, is_verified reflecting the HEAD-probe outcome.
--   - 'grok_live_search' / true: rows from /twitter (citation-validated).
