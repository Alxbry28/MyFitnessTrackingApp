import type { MealType } from "./foodLog";
import type { Product } from "./product";

export type PastedUnit = "g" | "ml" | "oz";

// grams is the amount converted for the log: ml counts as grams, oz as 28.35 g.
export type PastedFood = {
  kind: "food";
  raw: string;
  amount: number;
  unit: PastedUnit;
  grams: number;
  name: string;
  key: string;
};
export type PastedOther = { kind: "unread"; raw: string };
export type PastedLine = PastedFood | PastedOther;

// mealFromHeading is true when the heading names a meal, so the meal isn't offered as a choice.
export type PastedSection = {
  heading: string | null;
  meal: MealType;
  mealFromHeading: boolean;
  lines: PastedLine[];
};

export type MatchStatus = "matched" | "check" | "not_found";

// candidates are the library products whose name contains the typed name.
export type LineMatch = { status: MatchStatus; product: Product | null; candidates: Product[] };

export type RememberedMatch = { nameKey: string; productId: string };
