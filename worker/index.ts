import { Hono } from "hono";
import type { Env } from "./types";
import { onError, securityHeaders } from "./security";
import { publicRoutes } from "./routes/public";

const app = new Hono<{ Bindings: Env }>();

// Only /api/* reaches the Worker (see run_worker_first in wrangler.jsonc).
const api = new Hono<{ Bindings: Env }>();
api.use("*", securityHeaders);
api.use("*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    return c.json({ error: "Method not allowed" }, 405, { Allow: "GET, HEAD" });
  }
  await next();
});
api.route("/", publicRoutes);
api.notFound((c) => c.json({ error: "Not found" }, 404));
api.onError(onError);

app.route("/api", api);
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError(onError);

export default app;
