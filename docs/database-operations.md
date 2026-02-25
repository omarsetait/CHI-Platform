# Database Operations Guide

## Overview
This document covers database migrations, backup procedures, and disaster recovery for the FWA Detection Platform using Neon PostgreSQL with Drizzle ORM.

## Schema Management

### Drizzle ORM Configuration
The schema is defined in `shared/schema.ts` using Drizzle ORM. Configuration is in `drizzle.config.ts`.

### Applying Schema Changes

**Development - Push Changes Directly:**
```bash
npm run db:push
```

If there are conflicts or warnings:
```bash
npm run db:push --force
```

**Production - Generate and Review Migrations:**
```bash
# Generate migration SQL files
npx drizzle-kit generate

# Review generated SQL in drizzle/ directory
# Apply migrations
npx drizzle-kit migrate
```

### Schema Change Best Practices
1. Never change primary key ID column types (serial to varchar or vice versa)
2. Add new columns as nullable or with defaults
3. Test schema changes in development before production
4. Back up data before destructive changes

## Database Indexes

Indexes are created automatically on server startup via `server/db-indexes.ts`. The following tables have optimized indexes:

- **FWA Module**: fwa_cases, fwa_analysis_findings, fwa_categories, fwa_actions
- **Pre-Auth Module**: pre_auth_claims, pre_auth_signals, pre_auth_decisions, pre_auth_batches
- **Claims Pipeline**: claim_ingest_items, claim_ingest_batches
- **Provider Relations**: provider_benchmarks, operational_findings_ledger, evidence_packs
- **Context 360**: patient_360, provider_360, doctor_360
- **Audit**: audit_logs

## Data Integrity Constraints

CHECK constraints are applied via `server/db-constraints.ts` to enforce:
- Non-negative monetary amounts
- Valid percentage/score ranges (0-100 or 0-1)
- Valid phase/layer ranges (1-6 for pre-auth workflow)
- Non-negative count values

## Connection Pooling

Configuration in `server/db.ts`:
- **Production**: max 10 connections
- **Development**: max 5 connections
- **Idle timeout**: 30 seconds
- **Connection timeout**: 10 seconds

Graceful shutdown is implemented to properly close all connections on SIGTERM/SIGINT.

## Backup & Recovery

### Neon Point-in-Time Recovery (PITR)
Neon automatically maintains:
- Continuous backups with second-level granularity
- 7-day retention on Free tier, 30+ days on Pro
- Instant branching for database copies

### Recovery Procedures

**Restore to a Point in Time:**
1. Log into Neon Console
2. Navigate to your project > Branches
3. Click "Create Branch" and select a timestamp
4. Update DATABASE_URL to point to the new branch

**Database Branching for Testing:**
```bash
# Create a branch via Neon CLI (if installed)
neonctl branches create --name test-branch --parent main

# Or use the Neon Console UI
```

### Manual Backup (pg_dump)
For additional backup security:
```bash
# Export schema only
pg_dump $DATABASE_URL --schema-only > backup/schema_$(date +%Y%m%d).sql

# Export data
pg_dump $DATABASE_URL --data-only > backup/data_$(date +%Y%m%d).sql

# Full backup
pg_dump $DATABASE_URL > backup/full_$(date +%Y%m%d).sql
```

### Restore from Backup
```bash
psql $DATABASE_URL < backup/full_20260109.sql
```

## Monitoring

### Connection Pool Health
The pool logs connection events:
- `[DB Pool] New client connected` - New connection established
- `[DB Pool] Unexpected error on idle client` - Connection error

### Query Performance
Monitor slow queries using Neon's Query Advisor in the console.

## Disaster Recovery Checklist

1. **Data Loss Event**
   - Identify the last known good timestamp
   - Create a Neon branch at that timestamp
   - Verify data integrity
   - Update application DATABASE_URL
   - Notify stakeholders

2. **Connection Issues**
   - Check Neon service status
   - Verify DATABASE_URL is correct
   - Check connection pool limits
   - Review error logs for specific failures

3. **Schema Corruption**
   - Stop application to prevent further damage
   - Create branch from last good state
   - Review and fix schema issues
   - Apply corrected schema via db:push

## Environment Variables

Required:
- `DATABASE_URL` - Neon PostgreSQL connection string

Optional:
- `NODE_ENV` - Set to 'production' for optimized pool settings
