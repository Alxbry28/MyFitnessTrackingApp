import type { BackupRows } from "../repositories/backupRepo";

// Kept free of React and SQLite so it can get unit tests once a runner exists.

export type Backup = {
  format: "myfitnesstrackingapp-backup";
  formatVersion: 1;
  schemaVersion: number;
  exportedAt: string;
  tables: BackupRows;
};

export function buildBackup(tables: BackupRows, schemaVersion: number, now: Date): Backup {
  return {
    format: "myfitnesstrackingapp-backup",
    formatVersion: 1,
    schemaVersion,
    exportedAt: now.toISOString(),
    tables,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}
