import type { SQLiteDatabase } from "expo-sqlite";

import * as m001 from "./001_init";
import * as m002 from "./002_food_log";
import * as m003 from "./003_settings";
import * as m004 from "./004_body";
import * as m005 from "./005_text_log_matches";
import * as m006 from "./006_body_profile_setup";

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
];
