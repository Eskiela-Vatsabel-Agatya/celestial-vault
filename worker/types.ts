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

// Worker-only bindings.
export interface Env { DB: D1Database }
