import { Hono } from "hono";
import type { AppEnv } from "./types";
import { onError, securityHeaders } from "./security";
import { guardWrites } from "./guards";
import { publicRoutes } from "./routes/public";
import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";

const app = new Hono<AppEnv>();

// Only /api/* reaches the Worker (see run_worker_first in wrangler.jsonc).
const api = new Hono<AppEnv>();
api.use("*", securityHeaders);
api.use("*", async (c, next) => {
  if (c.req.method === "GET" || c.req.method === "HEAD") return next();
  // Writes are only possible under /auth and /admin; everything else stays read-only.
  const writable = c.req.path.startsWith("/api/auth/") || c.req.path.startsWith("/api/admin/");
  if (!writable) return c.json({ error: "Method not allowed" }, 405, { Allow: "GET, HEAD" });
  return guardWrites(c, next);
});
api.route("/", publicRoutes);
api.route("/auth", authRoutes);
api.route("/admin", adminRoutes);
api.notFound((c) =>
  c.req.method === "GET" || c.req.method === "HEAD"
    ? c.json({ error: "Not found" }, 404)
    : c.json({ error: "Method not allowed" }, 405, { Allow: "GET, HEAD" }));
api.onError(onError);

app.route("/api", api);
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError(onError);

export default app;
