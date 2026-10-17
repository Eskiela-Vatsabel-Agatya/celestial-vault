import type { Context, MiddlewareHandler } from "hono";

// ONE place for the security headers.
// IMPORTANT: public/_headers must contain the same values. Keep them in sync (Phase 2 extends the CSP).
export const CSP =
  "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
  "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-Robots-Tag": "noindex, nofollow",
};

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) c.res.headers.set(k, v);
  // Auth and admin responses must never be cached.
  if (c.req.path.startsWith("/api/auth/") || c.req.path.startsWith("/api/admin/")) c.res.headers.set("Cache-Control", "no-store");
};

// Generic errors only: details go to the server log, never to the visitor.
export const onError = (err: Error, c: Context) => {
  console.error("Unhandled error:", err.message);
  return c.json({ error: "Something went wrong" }, 500);
};
