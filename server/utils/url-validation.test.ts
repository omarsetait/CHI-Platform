import { describe, it, expect } from "vitest";
import { isValidXStatusUrl, isValidHttpUrl, normalizeXUrl } from "./url-validation";

describe("isValidXStatusUrl", () => {
  it("accepts valid x.com status URL", () => {
    expect(isValidXStatusUrl("https://x.com/elonmusk/status/1234567890123456789")).toBe(true);
  });
  it("accepts valid twitter.com status URL", () => {
    expect(isValidXStatusUrl("https://twitter.com/handle/status/1234567890123456789")).toBe(true);
  });
  it("accepts URL with query string", () => {
    expect(isValidXStatusUrl("https://x.com/h/status/1234567890123456789?ref_src=twsrc%5Etfw")).toBe(true);
  });
  it("rejects short status IDs (hashed-content fakes)", () => {
    expect(isValidXStatusUrl("https://twitter.com/SaudiPatient_22/status/123456")).toBe(false);
  });
  it("rejects http (non-https)", () => {
    expect(isValidXStatusUrl("http://x.com/h/status/1234567890123456789")).toBe(false);
  });
  it("rejects non-status paths", () => {
    expect(isValidXStatusUrl("https://x.com/elonmusk")).toBe(false);
  });
  it("rejects empty / undefined", () => {
    expect(isValidXStatusUrl("")).toBe(false);
    expect(isValidXStatusUrl(undefined as any)).toBe(false);
  });
  it("accepts max-length 15-char username", () => {
    expect(isValidXStatusUrl("https://x.com/abcdefghijklmno/status/1234567890123456789")).toBe(true);
  });
  it("rejects 16-char username (over Twitter limit)", () => {
    expect(isValidXStatusUrl("https://x.com/abcdefghijklmnop/status/1234567890123456789")).toBe(false);
  });
});

describe("isValidHttpUrl", () => {
  it("accepts https", () => {
    expect(isValidHttpUrl("https://www.alriyadh.com/article/1")).toBe(true);
  });
  it("accepts http", () => {
    expect(isValidHttpUrl("http://example.com")).toBe(true);
  });
  it("rejects javascript:", () => {
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
  });
  it("rejects empty", () => {
    expect(isValidHttpUrl("")).toBe(false);
  });
  it("rejects null and undefined", () => {
    expect(isValidHttpUrl(null as any)).toBe(false);
    expect(isValidHttpUrl(undefined as any)).toBe(false);
  });
});

describe("normalizeXUrl", () => {
  it("strips query string", () => {
    expect(normalizeXUrl("https://x.com/h/status/1234567890123456789?s=20")).toBe(
      "https://x.com/h/status/1234567890123456789"
    );
  });
  it("rewrites twitter.com → x.com", () => {
    expect(normalizeXUrl("https://twitter.com/h/status/1234567890123456789")).toBe(
      "https://x.com/h/status/1234567890123456789"
    );
  });
  it("returns null for invalid URL", () => {
    expect(normalizeXUrl("not a url")).toBeNull();
  });
  it("strips fragment", () => {
    expect(normalizeXUrl("https://x.com/h/status/1234567890123456789#media")).toBe(
      "https://x.com/h/status/1234567890123456789"
    );
  });
  it("returns null for null and undefined input", () => {
    expect(normalizeXUrl(null as any)).toBeNull();
    expect(normalizeXUrl(undefined as any)).toBeNull();
  });
});
