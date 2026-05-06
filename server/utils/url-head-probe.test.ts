import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { headProbe, headProbeMany } from "./url-head-probe";

describe("headProbe", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("returns ok=true on 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const res = await headProbe("https://example.com", 1000);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
  });

  it("returns ok=false on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const res = await headProbe("https://example.com/missing", 1000);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });

  it("returns ok=false on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("DNS fail")));
    const res = await headProbe("https://nope.invalid", 1000);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("DNS fail");
  });

  it("times out after configured ms", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_, opts: any) => new Promise((_, reject) => {
        opts.signal.addEventListener("abort", () => reject(new Error("aborted")));
      }))
    );
    const res = await headProbe("https://slow.example", 50);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/abort|timeout/i);
  });
});

describe("headProbeMany", () => {
  it("respects concurrency cap", async () => {
    let inFlight = 0, peak = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      inFlight++; peak = Math.max(peak, inFlight);
      await new Promise(r => setTimeout(r, 10));
      inFlight--;
      return { ok: true, status: 200 };
    }));
    const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/${i}`);
    await headProbeMany(urls, { concurrency: 3, timeoutMs: 1000 });
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("returns one result per input url", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const urls = ["https://a.com", "https://b.com"];
    const results = await headProbeMany(urls, { concurrency: 2, timeoutMs: 1000 });
    expect(results.size).toBe(2);
    expect(results.get("https://a.com")?.ok).toBe(true);
  });
});
