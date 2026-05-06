import { describe, it, expect } from "vitest";
import { ListeningProvenance, isListeningProvenance } from "./online-listening-provenance";

describe("ListeningProvenance", () => {
  it("exposes the seven canonical values", () => {
    expect(ListeningProvenance).toEqual({
      NEWSAPI_EVERYTHING: "newsapi_everything",
      NEWSAPI_TOP_HEADLINES_SA: "newsapi_top_headlines_sa",
      GOOGLE_NEWS_RSS: "google_news_rss",
      GROK_LIVE_SEARCH: "grok_live_search",
      DEMO_SEED: "demo_seed",
      MANUAL: "manual",
      UNKNOWN: "unknown",
    });
  });

  it("isListeningProvenance accepts canonical values", () => {
    expect(isListeningProvenance("newsapi_everything")).toBe(true);
    expect(isListeningProvenance("demo_seed")).toBe(true);
  });

  it("isListeningProvenance rejects unknown strings", () => {
    expect(isListeningProvenance("grok_no_search")).toBe(false);
    expect(isListeningProvenance("")).toBe(false);
    expect(isListeningProvenance(undefined)).toBe(false);
  });
});
