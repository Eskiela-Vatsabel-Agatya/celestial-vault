import { Cuboid, Infinity as InfinityIcon, Hammer, Anchor, Wrench, Crosshair, Shield, Swords, Sparkles, Package, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  cuboid: Cuboid, infinity: InfinityIcon, hammer: Hammer, anchor: Anchor, wrench: Wrench,
  crosshair: Crosshair, shield: Shield, swords: Swords, sparkles: Sparkles, package: Package,
};
export function CategoryIcon({ name, size = 16, color }: { name: string | null; size?: number; color?: string }) {
  const Icon = (name && MAP[name]) || Package;
  return <Icon size={size} color={color} aria-hidden="true" />;
}
