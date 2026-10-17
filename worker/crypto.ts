// Small Web Crypto helpers. Messages get a label prefix so one secret can safely serve several purposes.
const enc = new TextEncoder();

export async function makeHmac(secret: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return {
    sign: async (msg: string) => new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg))),
    verify: (sig: BufferSource, msg: string) => crypto.subtle.verify("HMAC", key, sig, enc.encode(msg)),
  };
}

export const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

export function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function b64urlToBytes(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Random integer in [min, max] using the CSPRNG. */
export function randomBetween(min: number, max: number): number {
  const r = crypto.getRandomValues(new Uint32Array(1))[0];
  return min + (r % (max - min + 1));
}

/** ISO-8601 UTC without fractions, like the schema defaults (2026-10-17T02:12:39Z). */
export const isoNow = (ms = Date.now()) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

/** Constant-time comparison (Workers runtime extension; missing from the shared DOM typings, hence the cast). */
export function timingEqual(a: Uint8Array, b: Uint8Array): boolean {
  const subtle = crypto.subtle as unknown as { timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean };
  return a.byteLength === b.byteLength && subtle.timingSafeEqual(a, b);
}
