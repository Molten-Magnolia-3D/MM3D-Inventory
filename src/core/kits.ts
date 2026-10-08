import type { BomLine, Item, LeafRequirement, StockRow } from "./types";

export function flattenBom(
  kitId: string,
  bomByKit: Map<string, BomLine[]>,
  multiplier = 1,
  trail: string[] = [],
): LeafRequirement[] {
  if (trail.includes(kitId)) {
    throw new Error(
      `Nested kit cycle: ${[...trail, kitId].join(" → ")}`,
    );
  }
  const lines = bomByKit.get(kitId) ?? [];
  const leaves: LeafRequirement[] = [];
  for (const line of lines) {
    if (line.nestedKitId) {
      leaves.push(
        ...flattenBom(
          line.nestedKitId,
          bomByKit,
          multiplier * line.qty,
          [...trail, kitId],
        ),
      );
    }
    if (line.componentItemId || (line.filamentGrams ?? 0) > 0) {
      leaves.push({
        itemId: line.componentItemId,
        qty: line.componentItemId ? line.qty * multiplier : 0,
        filamentGrams: (line.filamentGrams ?? 0) * multiplier,
        filamentMaterial: line.filamentMaterial,
        sourceKitIds: [...trail, kitId],
      });
    }
  }
  return mergeLeaves(leaves);
}

export function mergeLeaves(leaves: LeafRequirement[]): LeafRequirement[] {
  const map = new Map<string, LeafRequirement>();
  for (const leaf of leaves) {
    const key = `${leaf.itemId ?? ""}|${leaf.filamentMaterial ?? ""}|${leaf.filamentGrams > 0 ? "fil" : "qty"}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...leaf, sourceKitIds: [...leaf.sourceKitIds] });
      continue;
    }
    existing.qty += leaf.qty;
    existing.filamentGrams += leaf.filamentGrams;
    for (const id of leaf.sourceKitIds) {
      if (!existing.sourceKitIds.includes(id)) existing.sourceKitIds.push(id);
    }
  }
  return [...map.values()];
}

export function canMakeFromStock(
  leaves: LeafRequirement[],
  stockByItem: Map<string, number>,
  gramsByMaterial: Map<string, number>,
  totalFilamentGrams: number,
): number {
  let max = Infinity;
  let any = false;
  for (const leaf of leaves) {
    if (leaf.itemId && leaf.qty > 0) {
      any = true;
      const onHand = stockByItem.get(leaf.itemId) ?? 0;
      const usable = Math.max(0, onHand);
      max = Math.min(max, Math.floor(usable / leaf.qty));
    }
    if (leaf.filamentGrams > 0) {
      any = true;
      const pool = leaf.filamentMaterial
        ? (gramsByMaterial.get(leaf.filamentMaterial.toUpperCase()) ?? 0)
        : totalFilamentGrams;
      max = Math.min(max, Math.floor(Math.max(0, pool) / leaf.filamentGrams));
    }
  }
  if (!any) return 0;
  return Number.isFinite(max) ? Math.max(0, max) : 0;
}

export function estimatedCost(
  leaves: LeafRequirement[],
  itemsById: Map<string, Item>,
  filamentCostPerGram: number,
): number {
  let cost = 0;
  for (const leaf of leaves) {
    if (leaf.itemId && leaf.qty > 0) {
      const item = itemsById.get(leaf.itemId);
      cost += (item?.costUsd ?? 0) * leaf.qty;
    }
    if (leaf.filamentGrams > 0) {
      cost += filamentCostPerGram * leaf.filamentGrams;
    }
  }
  return cost;
}

export function allocateFromLots(
  itemId: string,
  qtyNeeded: number,
  lots: StockRow[],
): { allocations: { itemId: string; locationId: string; qty: number }[]; short: number } {
  const sorted = [...lots]
    .filter((l) => l.itemId === itemId)
    .sort((a, b) => b.qty - a.qty);
  const allocations: { itemId: string; locationId: string; qty: number }[] = [];
  let remaining = qtyNeeded;
  for (const lot of sorted) {
    if (remaining <= 0) break;
    if (lot.qty <= 0) continue;
    const take = Math.min(lot.qty, remaining);
    allocations.push({ itemId, locationId: lot.locationId, qty: take });
    remaining -= take;
  }
  if (remaining > 0) {
    const fallback = sorted[0] ?? lots.find((l) => l.itemId === itemId);
    if (fallback) {
      const existing = allocations.find((a) => a.locationId === fallback.locationId);
      if (existing) existing.qty += remaining;
      else {
        allocations.push({
          itemId,
          locationId: fallback.locationId,
          qty: remaining,
        });
      }
      remaining = 0;
    }
  }
  return { allocations, short: remaining };
}
