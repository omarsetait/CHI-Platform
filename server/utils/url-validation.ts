const X_STATUS_PATTERN = /^https:\/\/(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status\/\d{15,20}(\?.*)?(#.*)?$/;

/** Returns true only for a structurally valid lowercase-https X/Twitter status URL. */
export function isValidXStatusUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  return X_STATUS_PATTERN.test(url);
}

/** Returns true for any well-formed http or https URL. Mixed-case schemes are normalized by URL parser. */
export function isValidHttpUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Normalizes a valid X status URL to lowercase https://x.com/<handle>/status/<id> with query and fragment stripped, or null if invalid. */
export function normalizeXUrl(url: string | undefined | null): string | null {
  if (!isValidXStatusUrl(url)) return null;
  const u = new URL(url!);
  return `https://x.com${u.pathname}`;
}
