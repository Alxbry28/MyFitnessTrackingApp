import type {
  BodyMeasurement,
  MeasurementSession,
  SiteDelta,
  TrackedSiteConfig,
} from "../types/measurements";

export const ALL_MEASUREMENT_SITES: TrackedSiteConfig[] = [
  {
    key: "neck",
    site: "neck",
    side: "none",
    label: "Neck",
    group: "Upper",
    defaultState: "relaxed",
    instruction: "Below the Adam's apple, tape level.",
  },
  {
    key: "shoulders",
    site: "shoulders",
    side: "none",
    label: "Shoulders",
    group: "Upper",
    defaultState: "relaxed",
    instruction: "Widest point around both shoulders, arms down.",
  },
  {
    key: "chest",
    site: "chest",
    side: "none",
    label: "Chest",
    group: "Upper",
    defaultState: "relaxed",
    instruction: "Across the nipples, arms down, after a normal breath out.",
  },
  {
    key: "arm_left",
    site: "arm",
    side: "left",
    label: "Left Arm",
    group: "Arms",
    defaultState: "flexed",
    instruction: "Widest point of biceps; pick flexed or relaxed and stay consistent.",
  },
  {
    key: "arm_right",
    site: "arm",
    side: "right",
    label: "Right Arm",
    group: "Arms",
    defaultState: "flexed",
    instruction: "Widest point of biceps; pick flexed or relaxed and stay consistent.",
  },
  {
    key: "forearm_left",
    site: "forearm",
    side: "left",
    label: "Left Forearm",
    group: "Arms",
    defaultState: "relaxed",
    instruction: "Widest point below elbow, arm straight.",
  },
  {
    key: "forearm_right",
    site: "forearm",
    side: "right",
    label: "Right Forearm",
    group: "Arms",
    defaultState: "relaxed",
    instruction: "Widest point below elbow, arm straight.",
  },
  {
    key: "waist",
    site: "waist",
    side: "none",
    label: "Waist",
    group: "Core",
    defaultState: "relaxed",
    instruction: "At the navel, relaxed, after breathing out normally.",
  },
  {
    key: "hips",
    site: "hips",
    side: "none",
    label: "Hips",
    group: "Core",
    defaultState: "relaxed",
    instruction: "Widest point around the buttocks, feet together.",
  },
  {
    key: "thigh_left",
    site: "thigh",
    side: "left",
    label: "Left Thigh",
    group: "Legs",
    defaultState: "relaxed",
    instruction: "Widest point of upper thigh, standing with weight evenly distributed.",
  },
  {
    key: "thigh_right",
    site: "thigh",
    side: "right",
    label: "Right Thigh",
    group: "Legs",
    defaultState: "relaxed",
    instruction: "Widest point of upper thigh, standing with weight evenly distributed.",
  },
  {
    key: "calf_left",
    site: "calf",
    side: "left",
    label: "Left Calf",
    group: "Legs",
    defaultState: "relaxed",
    instruction: "Widest point of calf, standing.",
  },
  {
    key: "calf_right",
    site: "calf",
    side: "right",
    label: "Right Calf",
    group: "Legs",
    defaultState: "relaxed",
    instruction: "Widest point of calf, standing.",
  },
];

export const DEFAULT_TRACKED_SITE_KEYS = [
  "chest",
  "waist",
  "arm_left",
  "arm_right",
  "thigh_left",
  "thigh_right",
];

export function getSiteKey(site: string, side: string): string {
  if (side === "none" || !side) return site;
  return `${site}_${side}`;
}

export type WaistToHeightResult = {
  ratio: number;
  category: "healthy" | "increased_risk" | "high_risk";
  label: string;
};

export function calculateWaistToHeight(
  waistCm: number | null | undefined,
  heightCm: number | null | undefined,
): WaistToHeightResult | null {
  if (!waistCm || !heightCm || waistCm <= 0 || heightCm <= 0) return null;
  const ratio = Math.round((waistCm / heightCm) * 100) / 100;

  if (ratio < 0.5) {
    return { ratio, category: "healthy", label: "Healthy (<0.50)" };
  }
  if (ratio < 0.6) {
    return { ratio, category: "increased_risk", label: "Increased risk (0.50–0.59)" };
  }
  return { ratio, category: "high_risk", label: "High risk (≥0.60)" };
}

export function formatCm(cm: number | null | undefined): string {
  if (cm === null || cm === undefined || isNaN(cm)) return "—";
  return `${cm.toFixed(1).replace(/\.0$/, "")} cm`;
}

export function formatDelta(deltaCm: number | null | undefined): string {
  if (deltaCm === null || deltaCm === undefined || isNaN(deltaCm)) return "—";
  if (Math.abs(deltaCm) < 0.05) return "0.0 cm";
  const sign = deltaCm > 0 ? "+" : "";
  return `${sign}${deltaCm.toFixed(1)} cm`;
}

export function computeSiteDeltas(
  current: MeasurementSession,
  previous?: MeasurementSession | null,
  baseline?: MeasurementSession | null,
  trackedKeys?: string[],
): SiteDelta[] {
  const currentMap = new Map<string, BodyMeasurement>();
  for (const m of current.measurements) {
    currentMap.set(getSiteKey(m.site, m.side), m);
  }

  const prevMap = new Map<string, BodyMeasurement>();
  if (previous && previous.id !== current.id) {
    for (const m of previous.measurements) {
      prevMap.set(getSiteKey(m.site, m.side), m);
    }
  }

  const baseMap = new Map<string, BodyMeasurement>();
  if (baseline) {
    for (const m of baseline.measurements) {
      baseMap.set(getSiteKey(m.site, m.side), m);
    }
  }

  const keys = trackedKeys ?? ALL_MEASUREMENT_SITES.map((s) => s.key);
  const result: SiteDelta[] = [];

  for (const key of keys) {
    const config = ALL_MEASUREMENT_SITES.find((s) => s.key === key);
    const curr = currentMap.get(key);
    if (!curr) continue;

    const prev = prevMap.get(key);
    const base = baseMap.get(key);

    const deltaLast = prev ? Math.round((curr.valueCm - prev.valueCm) * 10) / 10 : null;
    const deltaStart = base ? Math.round((curr.valueCm - base.valueCm) * 10) / 10 : null;

    result.push({
      siteKey: key,
      label: config?.label ?? key,
      group: config?.group ?? "Upper",
      currentCm: curr.valueCm,
      lastCm: prev ? prev.valueCm : null,
      deltaLastCm: deltaLast,
      startCm: base ? base.valueCm : null,
      deltaStartCm: deltaStart,
    });
  }

  return result;
}
