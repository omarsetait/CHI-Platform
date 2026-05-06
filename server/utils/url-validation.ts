const X_STATUS_PATTERN = /^https:\/\/(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status\/\d{15,20}(\?.*)?(#.*)?$/;

export function isValidXStatusUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  return X_STATUS_PATTERN.test(url);
}

export function isValidHttpUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeXUrl(url: string | undefined | null): string | null {
  if (!isValidXStatusUrl(url)) return null;
  const u = new URL(url!);
  return `https://x.com${u.pathname}`;
}
