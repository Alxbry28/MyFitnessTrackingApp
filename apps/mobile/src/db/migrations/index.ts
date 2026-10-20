import type { SQLiteDatabase } from "expo-sqlite";

import * as m001 from "./001_init";

export type Migration = {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

// Append only. Versions are applied in order and never edited after release,
// because phones in daily use already ran them.
export const migrations: Migration[] = [{ version: 1, name: "001_init", up: m001.up }];
