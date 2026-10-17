import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./types";

// Request safety for every state-changing (non-GET) call: CSRF and abuse limits.
const MAX_AUTH_BYTES = 2 * 1024;
const MAX_BYTES = 64 * 1024;

export const guardWrites: MiddlewareHandler<AppEnv> = async (c, next) => {
  const origin = c.req.header("Origin");
  if (!origin || origin !== new URL(c.req.url).origin) return c.json({ error: "Forbidden" }, 403);
  if (c.req.header("X-CV-Request") !== "1") return c.json({ error: "Forbidden" }, 403);
  if (!(c.req.header("Content-Type") ?? "").toLowerCase().startsWith("application/json")) return c.json({ error: "Forbidden" }, 403);

  const max = c.req.path.startsWith("/api/auth/") ? MAX_AUTH_BYTES : MAX_BYTES;
  const declared = Number(c.req.header("Content-Length") ?? "0");
  if (declared > max) return c.json({ error: "Request too large" }, 413);

  // Read the body ourselves so the limit holds even without a Content-Length header.
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = c.req.raw.body?.getReader();
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) { await reader.cancel(); return c.json({ error: "Request too large" }, 413); }
      chunks.push(value);
    }
  }
  let text = "";
  const dec = new TextDecoder();
  for (const ch of chunks) text += dec.decode(ch, { stream: true });
  try {
    c.set("json", text.trim() === "" ? {} : JSON.parse(text));
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }
  await next();
};
