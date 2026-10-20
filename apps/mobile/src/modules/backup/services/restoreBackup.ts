import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import type { SQLiteDatabase } from "expo-sqlite";

import { migrations } from "@/db/migrations";

import { readAll } from "../repositories/backupRepo";
import { migrateRows, replaceAll } from "../repositories/restoreRepo";
import { buildBackup, type Backup } from "./backupFile";
import { countRows, parseBackupText, type BackupCounts, type ParsedBackup } from "./restoreFile";

export const APP_SCHEMA_VERSION = migrations[migrations.length - 1].version;

const SAFETY_DIR = "pre-restore";
const SAFETY_NAME = /^pre-restore-(.+)\.json$/;

export type PickedBackup = ParsedBackup | { ok: false; error: "cancelled" | "unreadable" };

export class SafetyCopyError extends Error {}

export async function pickBackupFile(): Promise<PickedBackup> {
  const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
  if (result.canceled || result.assets.length === 0) return { ok: false, error: "cancelled" };
  return readBackupFile(new File(result.assets[0].uri));
}

async function readBackupFile(file: File): Promise<PickedBackup> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "unreadable" };
  }
  return parseBackupText(text, APP_SCHEMA_VERSION);
}

// File names carry the UTC time with ":" swapped for "-", so they sort by time.
function safetyName(now: Date): string {
  return `pre-restore-${now.toISOString().replace(/:/g, "-")}.json`;
}

function takenAt(name: string): Date | null {
  const stamp = SAFETY_NAME.exec(name)?.[1]?.replace(/T(\d\d)-(\d\d)-(\d\d)/, "T$1:$2:$3");
  const date = stamp ? new Date(stamp) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function latestSafetyCopy(): { file: File; takenAt: Date } | null {
  const dir = new Directory(Paths.document, SAFETY_DIR);
  if (!dir.exists) return null;
  const copies = dir
    .list()
    .filter((entry): entry is File => entry instanceof File && takenAt(entry.name) !== null)
    .sort((a, b) => b.name.localeCompare(a.name));
  const newest = copies[0];
  return newest ? { file: newest, takenAt: takenAt(newest.name) as Date } : null;
}

export function readSafetyCopy(file: File): Promise<PickedBackup> {
  return readBackupFile(file);
}

export async function currentCounts(db: SQLiteDatabase): Promise<BackupCounts> {
  return countRows((await readAll(db)).tables);
}

async function writeSafetyCopy(db: SQLiteDatabase, now: Date): Promise<void> {
  let file: File | null = null;
  try {
    const { tables, schemaVersion } = await readAll(db);
    const dir = new Directory(Paths.document, SAFETY_DIR);
    dir.create({ intermediates: true, idempotent: true });
    file = new File(dir, safetyName(now));
    file.create();
    file.write(JSON.stringify(buildBackup(tables, schemaVersion, now)));
  } catch (error) {
    // A half-written copy must not be offered later as "Undo last restore".
    try {
      if (file?.exists) file.delete();
    } catch {
      // Nothing more to do; the restore is stopped either way.
    }
    throw new SafetyCopyError(error instanceof Error ? error.message : "Safety copy failed");
  }
}

// Order matters for data safety: the copy of today's data is written before anything changes,
// and the replace itself is one transaction.
export async function restoreBackup(db: SQLiteDatabase, backup: Backup): Promise<BackupCounts> {
  await writeSafetyCopy(db, new Date());
  const tables = await migrateRows(backup.tables, backup.schemaVersion);
  await replaceAll(db, tables);
  return countRows(tables);
}
