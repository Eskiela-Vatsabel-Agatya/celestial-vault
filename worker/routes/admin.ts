import { Hono } from "hono";
import type { AppEnv } from "../types";
import { requireEditor } from "../session";

// Every /api/admin/* route sits behind requireEditor (Phase 3 adds the editing endpoints here).
export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use("*", requireEditor);
adminRoutes.get("/ping", (c) => c.json({ ok: true }));
