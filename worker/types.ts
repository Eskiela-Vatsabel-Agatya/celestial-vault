// Shared API shapes (used by the Worker and the React app).
export interface Category { id: string; name: string; description: string | null; icon: string | null; colorHex: string; sortOrder: number }
export interface Member {
  id: string; displayName: string; minecraftIgn: string | null; altIgn: string | null;
  guildRank: string; platform: "Java" | "Bedrock" | "Both" | null; kind: "player" | "label";
  isVaultBanned: boolean; notes: string | null;
}
export interface Item {
  id: number; categoryId: string; name: string; setTier: string | null; isMega: boolean;
  quantity: number; isInfinite: boolean; customLevel: number | null; notes: string | null;
  sortOrder: number; ownerIds: string[];
}
export interface Inventory { generatedAt: string; categories: Category[]; members: Member[]; items: Item[] }

// Worker-only bindings. The four secrets are set in the Cloudflare dashboard (type: Secret).
// Any of them may be undefined if not configured: the code fails closed.
export interface Env {
  DB: D1Database;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  JWT_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string; // public, from wrangler.jsonc vars
}
export interface AppEnv { Bindings: Env; Variables: { json: unknown } }
