import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { SQLiteDatabase } from "expo-sqlite";

import { dayKey } from "@/modules/nutrition/services/mealTime";

import { readAll } from "../repositories/backupRepo";
import { buildBackup } from "./backupFile";

export type ExportSummary = {
  products: number;
  entries: number;
  settings: number;
  weighIns: number;
  bytes: number;
};

// Writes the backup to the app cache and hands it to the Android share sheet.
export async function exportBackup(db: SQLiteDatabase): Promise<ExportSummary> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available");

  const now = new Date();
  const { tables, schemaVersion } = await readAll(db);
  const json = JSON.stringify(buildBackup(tables, schemaVersion, now), null, 2);

  const file = new File(Paths.cache, `myfitness-backup-${dayKey(now)}.json`);
  file.create({ overwrite: true });
  file.write(json);

  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Save your backup" });

  return {
    products: tables.products.length,
    entries: tables.food_log_entries.length,
    settings: tables.settings.length,
    weighIns: tables.body_weight_entries.length,
    bytes: new TextEncoder().encode(json).length,
  };
}
