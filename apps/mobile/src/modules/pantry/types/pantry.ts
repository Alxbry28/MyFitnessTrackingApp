export const PANTRY_KINDS = ["packaged", "supplement", "batch"] as const;
export type PantryKind = (typeof PANTRY_KINDS)[number];

export const LOCATIONS = ["cupboard", "fridge", "freezer"] as const;
export type PantryLocation = (typeof LOCATIONS)[number];

// One row of the Pantry list: an item with its ledger sums (stock is never stored, ADR-7).
export type PantryStock = {
  id: string;
  kind: PantryKind;
  productId: string | null;
  name: string;
  netWeightG: number | null;
  location: PantryLocation;
  expiresAt: string | null;
  gramsLeft: number;
};
