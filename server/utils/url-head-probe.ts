export interface HeadResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export async function headProbe(url: string, timeoutMs: number): Promise<HeadResult> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 TachyHealth/1.0" },
    });
    return { ok: res.ok, status: res.status };
  } catch (err: any) {
    return { ok: false, error: err?.message || "fetch failed" };
  } finally {
    clearTimeout(t);
  }
}

export async function headProbeMany(
  urls: string[],
  opts: { concurrency: number; timeoutMs: number }
): Promise<Map<string, HeadResult>> {
  const results = new Map<string, HeadResult>();
  const queue = [...urls];
  const workers = Array.from({ length: Math.min(opts.concurrency, urls.length) }, async () => {
    while (queue.length > 0) {
      const url = queue.shift()!;
      results.set(url, await headProbe(url, opts.timeoutMs));
    }
  });
  await Promise.all(workers);
  return results;
}
