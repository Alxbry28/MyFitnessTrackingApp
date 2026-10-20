import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { ImportPlan } from "../services/weightCsv";
import type { ImportRun, WeighIn, WeightSource } from "../types/body";

type WeighInRow = {
  id: string;
  day: string;
  measured_at: string;
  weight_kg: number;
  source: WeightSource;
  updated_at: string;
};

export type ChangeResult = { ok: true } | { ok: false; error: "not_found" };

const COLUMNS = "id, day, measured_at, weight_kg, source, updated_at";

function toWeighIn(row: WeighInRow): WeighIn {
  return {
    id: row.id,
    day: row.day,
    measuredAt: row.measured_at,
    weightKg: row.weight_kg,
    source: row.source,
    updatedAt: row.updated_at,
  };
}

export async function listSince(db: SQLiteDatabase, fromDay: string): Promise<WeighIn[]> {
  const rows = await db.getAllAsync<WeighInRow>(
    `SELECT ${COLUMNS} FROM body_weight_entries
     WHERE day >= ? AND deleted_at IS NULL ORDER BY measured_at`,
    fromDay,
  );
  return rows.map(toWeighIn);
}

// Readings of the most recent day with any, so BMI works after a long gap.
export async function listLatestDay(db: SQLiteDatabase): Promise<WeighIn[]> {
  const rows = await db.getAllAsync<WeighInRow>(
    `SELECT ${COLUMNS} FROM body_weight_entries
     WHERE deleted_at IS NULL
       AND day = (SELECT MAX(day) FROM body_weight_entries WHERE deleted_at IS NULL)
     ORDER BY measured_at`,
  );
  return rows.map(toWeighIn);
}

export async function listAll(db: SQLiteDatabase): Promise<WeighIn[]> {
  const rows = await db.getAllAsync<WeighInRow>(
    `SELECT ${COLUMNS} FROM body_weight_entries WHERE deleted_at IS NULL ORDER BY measured_at`,
  );
  return rows.map(toWeighIn);
}

export async function findById(db: SQLiteDatabase, id: string): Promise<WeighIn | null> {
  const row = await db.getFirstAsync<WeighInRow>(
    `SELECT ${COLUMNS} FROM body_weight_entries WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  return row ? toWeighIn(row) : null;
}

export async function manualForDay(
  db: SQLiteDatabase,
  day: string,
  excludeId: string | null,
): Promise<WeighIn | null> {
  const row = await db.getFirstAsync<WeighInRow>(
    `SELECT ${COLUMNS} FROM body_weight_entries
     WHERE day = ? AND source = 'manual' AND deleted_at IS NULL AND id IS NOT ?
     ORDER BY updated_at DESC LIMIT 1`,
    day,
    excludeId,
  );
  return row ? toWeighIn(row) : null;
}

export type ManualInput = { day: string; measuredAt: string; weightKg: number };

// Keeps one typed weight per day (10_body_progress §3): a new weight for a day
// that already has one replaces it, and an edit moved onto such a day removes it.
export async function saveManual(
  db: SQLiteDatabase,
  input: ManualInput,
  editingId: string | null,
): Promise<ChangeResult> {
  let result: ChangeResult = { ok: true };
  await db.withExclusiveTransactionAsync(async (txn) => {
    const now = new Date().toISOString();
    const other = await manualForDay(txn, input.day, editingId);
    if (editingId) {
      const editing = await findById(txn, editingId);
      if (!editing) {
        result = { ok: false, error: "not_found" };
        return;
      }
      const measuredAt = editing.day === input.day ? editing.measuredAt : input.measuredAt;
      await txn.runAsync(
        `UPDATE body_weight_entries SET day = ?, measured_at = ?, weight_kg = ?, updated_at = ?
         WHERE id = ?`,
        input.day,
        measuredAt,
        input.weightKg,
        now,
        editingId,
      );
      if (other && editing.source === "manual") {
        await txn.runAsync(
          "UPDATE body_weight_entries SET deleted_at = ?, updated_at = ? WHERE id = ?",
          now,
          now,
          other.id,
        );
      }
    } else if (other) {
      await txn.runAsync(
        "UPDATE body_weight_entries SET weight_kg = ?, updated_at = ? WHERE id = ?",
        input.weightKg,
        now,
        other.id,
      );
    } else {
      await txn.runAsync(
        `INSERT INTO body_weight_entries (id, day, measured_at, weight_kg, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'manual', ?, ?)`,
        randomUUID(),
        input.day,
        input.measuredAt,
        input.weightKg,
        now,
        now,
      );
    }
  });
  return result;
}

// Soft delete keeps the row for sync later (ADR-4).
export async function softDelete(db: SQLiteDatabase, id: string): Promise<ChangeResult> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    "UPDATE body_weight_entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
    now,
    now,
    id,
  );
  return result.changes === 0 ? { ok: false, error: "not_found" } : { ok: true };
}

// One transaction, so a failed import saves nothing. The run row lets Undo find
// exactly these readings later.
export async function importReadings(db: SQLiteDatabase, fileName: string, plan: ImportPlan): Promise<number> {
  const runId = randomUUID();
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO import_runs (id, source, file_name, started_at, found, added, skipped)
       VALUES (?, 'csv_import', ?, ?, ?, ?, ?)`,
      runId,
      fileName,
      now,
      plan.found,
      plan.toAdd.length,
      plan.found - plan.toAdd.length,
    );
    for (const r of plan.toAdd) {
      await txn.runAsync(
        `INSERT INTO body_weight_entries (id, day, measured_at, weight_kg, source, import_run_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'csv_import', ?, ?, ?)`,
        randomUUID(),
        r.day,
        r.measuredAt,
        r.weightKg,
        runId,
        now,
        now,
      );
    }
  });
  return plan.toAdd.length;
}

export async function lastImportRun(db: SQLiteDatabase): Promise<ImportRun | null> {
  const row = await db.getFirstAsync<{
    id: string;
    file_name: string | null;
    started_at: string;
    added: number;
    undone_at: string | null;
  }>(
    `SELECT id, file_name, started_at, added, undone_at FROM import_runs
     WHERE undone_at IS NULL ORDER BY started_at DESC LIMIT 1`,
  );
  return row
    ? { id: row.id, fileName: row.file_name, startedAt: row.started_at, added: row.added, undoneAt: row.undone_at }
    : null;
}

// Soft-deletes the run's readings, including any edited since, and marks it undone.
export async function undoImport(db: SQLiteDatabase, runId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `UPDATE body_weight_entries SET deleted_at = ?, updated_at = ?
       WHERE import_run_id = ? AND deleted_at IS NULL`,
      now,
      now,
      runId,
    );
    await txn.runAsync("UPDATE import_runs SET undone_at = ? WHERE id = ? AND undone_at IS NULL", now, runId);
  });
}
