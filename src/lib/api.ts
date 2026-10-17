import type { Inventory } from "./types";

export async function fetchInventory(): Promise<Inventory> {
  const res = await fetch("/api/inventory", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Could not load the vault");
  return (await res.json()) as Inventory;
}
