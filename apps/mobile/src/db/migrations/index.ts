import type { SQLiteDatabase } from "expo-sqlite";

import * as m001 from "./001_init";
import * as m002 from "./002_food_log";
import * as m003 from "./003_settings";
import * as m004 from "./004_body";
import * as m005 from "./005_text_log_matches";
import * as m006 from "./006_body_profile_setup";
import * as m007 from "./007_pantry";
import * as m008 from "./008_drained";
import * as m009 from "./009_pantry_product_unique";
import * as m010 from "./010_supplement_units";
import * as m011 from "./011_recipes_and_batches";

export type Migration = {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

// Append only. Versions are applied in order and never edited after release,
// because phones in daily use already ran them.
export const migrations: Migration[] = [
  { version: 1, name: "001_init", up: m001.up },
  { version: 2, name: "002_food_log", up: m002.up },
  { version: 3, name: "003_settings", up: m003.up },
  { version: 4, name: "004_body", up: m004.up },
  { version: 5, name: "005_text_log_matches", up: m005.up },
  { version: 6, name: "006_body_profile_setup", up: m006.up },
  { version: 7, name: "007_pantry", up: m007.up },
  { version: 8, name: "008_drained", up: m008.up },
  { version: 9, name: "009_pantry_product_unique", up: m009.up },
  { version: 10, name: "010_supplement_units", up: m010.up },
  { version: 11, name: "011_recipes_and_batches", up: m011.up },
];
