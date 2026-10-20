import { dayKey } from "@/modules/nutrition/services/mealTime";

import type { WeighIn } from "../types/body";
import { dailyValues } from "./weightCalc";

// The scale's export is untrusted input (SECURITY.md): every row is validated,
// and nothing here touches the database. Kept pure for unit tests later.

export const MAX_CSV_BYTES = 5 * 1024 * 1024;

const MIN_KG = 20;
const MAX_KG = 300;
const LB_TO_KG = 0.45359237;
const JIN_TO_KG = 0.5;
const DUPLICATE_MS = 2 * 60 * 1000;
const DUPLICATE_KG = 0.05;
const REVIEW_KG = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Reading = { measuredAt: string; day: string; weightKg: number };

export type ParseResult =
  | { ok: true; readings: Reading[]; unreadable: number }
  | { ok: false; error: "empty" | "no_columns" };

function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const TIME_HEADERS = ["time", "timestamp", "date", "datetime", "date time"];

function findColumns(header: string[]) {
  const names = header.map((h) => h.trim().toLowerCase());
  let time = names.findIndex((n) => TIME_HEADERS.includes(n));
  if (time === -1) time = names.findIndex((n) => n.includes("time") || n.includes("date"));
  const weight = names.findIndex((n) => n.includes("weight"));
  if (time === -1 || weight === -1) return null;
  const unit = names[weight];
  const factor = unit.includes("lb") ? LB_TO_KG : unit.includes("jin") || unit.includes("斤") ? JIN_TO_KG : 1;
  return { time, weight, factor };
}

const DATE_TIME =
  /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;

export function parseTime(value: string): Date | null {
  const v = value.trim();
  if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000);
  if (/^\d{13}$/.test(v)) return new Date(Number(v));
  const m = DATE_TIME.exec(v);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const hasTime = m[4] !== undefined;
  const [h, mi, s] = hasTime ? [Number(m[4]), Number(m[5]), Number(m[6] ?? 0)] : [12, 0, 0];
  if (mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59 || s > 59) return null;
  if (new Date(y, mo - 1, d, 12).getDate() !== d) return null;
  const zone = m[7];
  if (!zone) return new Date(y, mo - 1, d, h, mi, s);
  let offsetMin = 0;
  if (zone.toUpperCase() !== "Z") {
    const digits = zone.replace(":", "");
    offsetMin = (digits[0] === "-" ? -1 : 1) * (Number(digits.slice(1, 3)) * 60 + Number(digits.slice(3, 5)));
  }
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s) - offsetMin * 60 * 1000);
}

function parseWeight(value: string, factor: number): number | null {
  const v = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(v)) return null;
  const kg = Math.round(Number(v) * factor * 100) / 100;
  return kg >= MIN_KG && kg <= MAX_KG ? kg : null;
}

export function parseWeightCsv(raw: string, now: Date): ParseResult {
  const text = raw.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows = splitRows(text, delimiter);
  if (rows.length === 0) return { ok: false, error: "empty" };
  const columns = findColumns(rows[0]);
  if (!columns) return { ok: false, error: "no_columns" };

  const latest = now.getTime() + DAY_MS;
  const readings: Reading[] = [];
  let unreadable = 0;
  for (const row of rows.slice(1)) {
    const date = parseTime(row[columns.time] ?? "");
    const kg = parseWeight(row[columns.weight] ?? "", columns.factor);
    if (!date || Number.isNaN(date.getTime()) || date.getTime() > latest || kg === null) {
      unreadable++;
      continue;
    }
    readings.push({ measuredAt: date.toISOString(), day: dayKey(date), weightKg: kg });
  }
  readings.sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : a.measuredAt > b.measuredAt ? 1 : 0));
  return { ok: true, readings, unreadable };
}

export type ImportPlan = {
  found: number;
  toAdd: Reading[];
  duplicates: number;
  review: Reading[];
  from: string | null;
  to: string | null;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Rules from 10_body_progress §5b: skip readings within 2 minutes and 0.05 kg of
// one already known, and hold back readings far from the usual weight (likely
// another person on the same scale) for review instead of importing them.
export function planImport(readings: Reading[], existing: WeighIn[]): ImportPlan {
  const buckets = new Map<number, number[][]>();
  const remember = (ms: number, kg: number) => {
    const key = Math.floor(ms / 60000);
    const list = buckets.get(key) ?? [];
    list.push([ms, kg]);
    buckets.set(key, list);
  };
  const isDuplicate = (ms: number, kg: number) => {
    const key = Math.floor(ms / 60000);
    for (let k = key - 2; k <= key + 2; k++) {
      for (const [t, w] of buckets.get(k) ?? []) {
        if (Math.abs(t - ms) <= DUPLICATE_MS && Math.abs(w - kg) <= DUPLICATE_KG + 1e-9) return true;
      }
    }
    return false;
  };
  for (const e of existing) remember(Date.parse(e.measuredAt), e.weightKg);

  const usual = median([...dailyValues(existing).map((d) => d.weightKg), ...readings.map((r) => r.weightKg)]);
  const toAdd: Reading[] = [];
  const review: Reading[] = [];
  let duplicates = 0;
  for (const r of readings) {
    const ms = Date.parse(r.measuredAt);
    if (isDuplicate(ms, r.weightKg)) {
      duplicates++;
    } else if (usual !== null && Math.abs(r.weightKg - usual) > REVIEW_KG) {
      review.push(r);
    } else {
      toAdd.push(r);
    }
    remember(ms, r.weightKg);
  }
  return {
    found: readings.length,
    toAdd,
    duplicates,
    review,
    from: readings[0]?.day ?? null,
    to: readings[readings.length - 1]?.day ?? null,
  };
}
