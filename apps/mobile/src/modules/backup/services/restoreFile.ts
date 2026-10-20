import { z } from "zod";

import { BACKUP_TABLES, type BackupRows } from "../repositories/backupRepo";
import type { Backup } from "./backupFile";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

export type BackupCounts = { products: number; entries: number; weighIns: number; settings: number };

export type ParsedBackup =
  | { ok: true; backup: Backup; counts: BackupCounts }
  | { ok: false; error: "not_backup" | "newer" };

// SQLite exports only text, numbers and null, so anything else means the file was edited or isn't ours.
const cell = z.union([z.string(), z.number().refine(Number.isFinite), z.null()]);
const row = z.record(z.string(), cell);

const envelope = z.object({
  format: z.literal("myfitnesstrackingapp-backup"),
  formatVersion: z.literal(1),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(row)),
});

function active(rows: Record<string, unknown>[]): number {
  return rows.filter((r) => r.deleted_at === undefined || r.deleted_at === null).length;
}

export function countRows(tables: Partial<BackupRows>): BackupCounts {
  return {
    products: active(tables.products ?? []),
    entries: active(tables.food_log_entries ?? []),
    weighIns: active(tables.body_weight_entries ?? []),
    settings: (tables.settings ?? []).length,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Local time like "Oct 18, 21:04"; the raw text when it isn't a date.
export function formatBackupTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${hh}:${mm}`;
}

export function parseBackupText(text: string, appSchemaVersion: number): ParsedBackup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "not_backup" };
  }

  const parsed = envelope.safeParse(json);
  if (!parsed.success) return { ok: false, error: "not_backup" };
  const { schemaVersion, exportedAt, tables } = parsed.data;

  // A table this app doesn't know can only come from a newer app.
  const known: readonly string[] = BACKUP_TABLES;
  if (schemaVersion > appSchemaVersion || Object.keys(tables).some((name) => !known.includes(name))) {
    return { ok: false, error: "newer" };
  }

  // Older backups simply lack the tables added since; they restore as empty.
  const complete = Object.fromEntries(BACKUP_TABLES.map((name) => [name, tables[name] ?? []])) as BackupRows;
  return {
    ok: true,
    backup: { format: "myfitnesstrackingapp-backup", formatVersion: 1, schemaVersion, exportedAt, tables: complete },
    counts: countRows(complete),
  };
}
