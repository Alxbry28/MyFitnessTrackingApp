import type { SQLiteDatabase } from "expo-sqlite";

import {
  calculateWaistToHeight,
  DEFAULT_TRACKED_SITE_KEYS,
  type WaistToHeightResult,
} from "../services/measurementCalc";
import type {
  BodyMeasurement,
  MeasurementSession,
  SessionInput,
} from "../types/measurements";

type SessionRow = {
  id: string;
  measured_on: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type MeasurementRow = {
  id: string;
  session_id: string;
  site: string;
  side: "left" | "right" | "none";
  value_cm: number;
  state: "relaxed" | "flexed";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function generateId(): string {
  return "ms_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function generateMeasurementId(): string {
  return "bm_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export const measurementRepo = {
  async listSessions(db: SQLiteDatabase, limit = 50): Promise<MeasurementSession[]> {
    const sessionRows = await db.getAllAsync<SessionRow>(
      `SELECT * FROM measurement_sessions
       WHERE deleted_at IS NULL
       ORDER BY measured_on DESC, created_at DESC
       LIMIT ?`,
      [limit],
    );

    if (sessionRows.length === 0) return [];

    const sessionIds = sessionRows.map((s) => s.id);
    const placeholders = sessionIds.map(() => "?").join(",");

    const measurementRows = await db.getAllAsync<MeasurementRow>(
      `SELECT * FROM body_measurements
       WHERE session_id IN (${placeholders}) AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      sessionIds,
    );

    const measurementsBySession = new Map<string, BodyMeasurement[]>();
    for (const m of measurementRows) {
      if (!measurementsBySession.has(m.session_id)) {
        measurementsBySession.set(m.session_id, []);
      }
      measurementsBySession.get(m.session_id)!.push({
        id: m.id,
        sessionId: m.session_id,
        site: m.site,
        side: m.side,
        valueCm: m.value_cm,
        state: m.state,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      });
    }

    return sessionRows.map((s) => ({
      id: s.id,
      measuredOn: s.measured_on,
      note: s.note,
      measurements: measurementsBySession.get(s.id) ?? [],
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  },

  async getSession(db: SQLiteDatabase, id: string): Promise<MeasurementSession | null> {
    const session = await db.getFirstAsync<SessionRow>(
      "SELECT * FROM measurement_sessions WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    if (!session) return null;

    const measurementRows = await db.getAllAsync<MeasurementRow>(
      `SELECT * FROM body_measurements
       WHERE session_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [id],
    );

    return {
      id: session.id,
      measuredOn: session.measured_on,
      note: session.note,
      measurements: measurementRows.map((m) => ({
        id: m.id,
        sessionId: m.session_id,
        site: m.site,
        side: m.side,
        valueCm: m.value_cm,
        state: m.state,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      })),
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  },

  async getLatestSession(db: SQLiteDatabase): Promise<MeasurementSession | null> {
    const row = await db.getFirstAsync<SessionRow>(
      `SELECT * FROM measurement_sessions
       WHERE deleted_at IS NULL
       ORDER BY measured_on DESC, created_at DESC
       LIMIT 1`,
    );
    if (!row) return null;
    return measurementRepo.getSession(db, row.id);
  },

  async getFirstSession(db: SQLiteDatabase): Promise<MeasurementSession | null> {
    const row = await db.getFirstAsync<SessionRow>(
      `SELECT * FROM measurement_sessions
       WHERE deleted_at IS NULL
       ORDER BY measured_on ASC, created_at ASC
       LIMIT 1`,
    );
    if (!row) return null;
    return measurementRepo.getSession(db, row.id);
  },

  async saveSession(
    db: SQLiteDatabase,
    input: SessionInput,
    existingId?: string,
  ): Promise<string> {
    const now = new Date().toISOString();
    const sessionId = existingId ?? generateId();

    await db.withExclusiveTransactionAsync(async (tx) => {
      if (existingId) {
        await tx.runAsync(
          `UPDATE measurement_sessions
           SET measured_on = ?, note = ?, updated_at = ?
           WHERE id = ?`,
          [input.measuredOn, input.note ?? null, now, existingId],
        );
        // Soft delete existing measurements for this session before re-inserting
        await tx.runAsync(
          "UPDATE body_measurements SET deleted_at = ? WHERE session_id = ?",
          [now, existingId],
        );
      } else {
        await tx.runAsync(
          `INSERT INTO measurement_sessions (id, measured_on, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          [sessionId, input.measuredOn, input.note ?? null, now, now],
        );
      }

      for (const m of input.measurements) {
        if (!m.valueCm || m.valueCm <= 0) continue;
        const measurementId = generateMeasurementId();
        await tx.runAsync(
          `INSERT INTO body_measurements (id, session_id, site, side, value_cm, state, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            measurementId,
            sessionId,
            m.site,
            m.side ?? "none",
            m.valueCm,
            m.state ?? "relaxed",
            now,
            now,
          ],
        );
      }
    });

    return sessionId;
  },

  async deleteSession(db: SQLiteDatabase, id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(
        "UPDATE measurement_sessions SET deleted_at = ? WHERE id = ?",
        [now, id],
      );
      await tx.runAsync(
        "UPDATE body_measurements SET deleted_at = ? WHERE session_id = ?",
        [now, id],
      );
    });
  },

  async getTrackedSites(db: SQLiteDatabase): Promise<string[]> {
    try {
      const row = await db.getFirstAsync<{ tracked_sites: string | null }>(
        "SELECT tracked_sites FROM body_profile WHERE id = 1",
      );
      if (row?.tracked_sites) {
        const parsed = JSON.parse(row.tracked_sites) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as string[];
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_TRACKED_SITE_KEYS;
  },

  async saveTrackedSites(db: SQLiteDatabase, keys: string[]): Promise<void> {
    const now = new Date().toISOString();
    const jsonStr = JSON.stringify(keys);
    await db.runAsync(
      `INSERT INTO body_profile (id, tracked_sites, updated_at)
       VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET tracked_sites = excluded.tracked_sites, updated_at = excluded.updated_at`,
      [jsonStr, now],
    );
  },

  async getWaistToHeight(db: SQLiteDatabase): Promise<WaistToHeightResult | null> {
    try {
      const profileRow = await db.getFirstAsync<{ height_cm: number | null }>(
        "SELECT height_cm FROM body_profile WHERE id = 1",
      );
      if (!profileRow?.height_cm) return null;

      // Find latest waist measurement
      const waistRow = await db.getFirstAsync<{ value_cm: number }>(
        `SELECT bm.value_cm
         FROM body_measurements bm
         JOIN measurement_sessions ms ON ms.id = bm.session_id
         WHERE bm.site = 'waist' AND bm.deleted_at IS NULL AND ms.deleted_at IS NULL
         ORDER BY ms.measured_on DESC, bm.created_at DESC
         LIMIT 1`,
      );

      if (!waistRow?.value_cm) return null;
      return calculateWaistToHeight(waistRow.value_cm, profileRow.height_cm);
    } catch {
      return null;
    }
  },
};
