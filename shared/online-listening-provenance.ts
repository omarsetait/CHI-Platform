export const ListeningProvenance = {
  NEWSAPI_EVERYTHING: "newsapi_everything",
  NEWSAPI_TOP_HEADLINES_SA: "newsapi_top_headlines_sa",
  GOOGLE_NEWS_RSS: "google_news_rss",
  GROK_LIVE_SEARCH: "grok_live_search",
  DEMO_SEED: "demo_seed",
  MANUAL: "manual",
  UNKNOWN: "unknown",
} as const;

export type ListeningProvenanceValue =
  (typeof ListeningProvenance)[keyof typeof ListeningProvenance];

const ALL: string[] = Object.values(ListeningProvenance);

export function isListeningProvenance(v: unknown): v is ListeningProvenanceValue {
  return typeof v === "string" && ALL.includes(v);
}
