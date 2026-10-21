export type MeasurementSite =
  | "neck"
  | "shoulders"
  | "chest"
  | "arm"
  | "forearm"
  | "waist"
  | "hips"
  | "thigh"
  | "calf";

export type MeasurementSide = "left" | "right" | "none";
export type MeasurementState = "relaxed" | "flexed";

export type BodyMeasurement = {
  id: string;
  sessionId: string;
  site: MeasurementSite | string;
  side: MeasurementSide;
  valueCm: number;
  state: MeasurementState;
  createdAt: string;
  updatedAt: string;
};

export type MeasurementSession = {
  id: string;
  measuredOn: string; // YYYY-MM-DD
  note: string | null;
  measurements: BodyMeasurement[];
  createdAt: string;
  updatedAt: string;
};

export type MeasurementValueInput = {
  site: MeasurementSite | string;
  side?: MeasurementSide;
  valueCm: number;
  state?: MeasurementState;
};

export type SessionInput = {
  measuredOn: string;
  note?: string | null;
  measurements: MeasurementValueInput[];
};

export type TrackedSiteConfig = {
  key: string; // e.g. "arm_left", "waist"
  site: MeasurementSite;
  side: MeasurementSide;
  label: string;
  group: "Upper" | "Arms" | "Core" | "Legs";
  defaultState: MeasurementState;
  instruction: string;
};

export type SiteDelta = {
  siteKey: string;
  label: string;
  group: "Upper" | "Arms" | "Core" | "Legs";
  currentCm: number;
  lastCm?: number | null;
  deltaLastCm?: number | null;
  startCm?: number | null;
  deltaStartCm?: number | null;
};
