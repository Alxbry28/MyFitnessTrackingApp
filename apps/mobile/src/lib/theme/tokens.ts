// Ported from prototypes/theme.css. Mockup-only tokens (desk, shadow) don't port,
// and camera tokens wait for the scanner in feature 4.

export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  scrim: string;
  text: string;
  muted: string;
  faint: string;
  accent: string;
  accentInk: string;
  accentText: string;
  accentSoft: string;
  ok: string;
  okSoft: string;
  over: string;
  overSoft: string;
  estimate: string;
  estimateSoft: string;
  protein: string;
  carbs: string;
  fat: string;
  track: string;
  pr: string;
  prSoft: string;
  timer: string;
  timerSoft: string;
  warmup: string;
  warmupSoft: string;
  rpe: string;
  rpeSoft: string;
  artBg: string;
  artInk: string;
  artMuscle: string;
  artSecondary: string;
};

export const dark: Palette = {
  bg: "#121110",
  surface: "#1c1a18",
  surface2: "#262320",
  border: "#322e2a",
  scrim: "rgba(0, 0, 0, 0.55)",
  text: "#f3efea",
  muted: "#a59d94",
  faint: "#6b645d",
  accent: "#ff7a1a",
  accentInk: "#1a0f05",
  accentText: "#ff8f3d",
  accentSoft: "rgba(255, 122, 26, 0.14)",
  ok: "#4cc38a",
  okSoft: "rgba(76, 195, 138, 0.14)",
  over: "#f0605a",
  overSoft: "rgba(240, 96, 90, 0.14)",
  estimate: "#e8b44a",
  estimateSoft: "rgba(232, 180, 74, 0.14)",
  protein: "#6aa8f0",
  carbs: "#e8b44a",
  fat: "#c58af0",
  track: "#2e2a26",
  pr: "#f5b841",
  prSoft: "rgba(245, 184, 65, 0.16)",
  timer: "#4ea8de",
  timerSoft: "rgba(78, 168, 222, 0.15)",
  warmup: "#e8b44a",
  warmupSoft: "rgba(232, 180, 74, 0.14)",
  rpe: "#c58af0",
  rpeSoft: "rgba(197, 138, 240, 0.14)",
  artBg: "#f8f6f2",
  artInk: "#262320",
  artMuscle: "#ff6b4a",
  artSecondary: "#ffa987",
};

export const light: Palette = {
  bg: "#f6f4f1",
  surface: "#ffffff",
  surface2: "#efebe6",
  border: "#e3ddd6",
  scrim: "rgba(29, 26, 23, 0.4)",
  text: "#1d1a17",
  muted: "#6e665e",
  faint: "#a39b92",
  accent: "#f26d12",
  accentInk: "#1a0f05",
  accentText: "#b44d07",
  accentSoft: "rgba(242, 109, 18, 0.12)",
  ok: "#1f8a57",
  okSoft: "rgba(31, 138, 87, 0.11)",
  over: "#d23f39",
  overSoft: "rgba(210, 63, 57, 0.1)",
  estimate: "#9a6a08",
  estimateSoft: "rgba(212, 150, 30, 0.14)",
  protein: "#2f7bd6",
  carbs: "#c98a0c",
  fat: "#9b55d0",
  track: "#ebe5de",
  pr: "#b87d04",
  prSoft: "rgba(212, 150, 30, 0.16)",
  timer: "#1d70a2",
  timerSoft: "rgba(29, 112, 162, 0.12)",
  warmup: "#9a6a08",
  warmupSoft: "rgba(212, 150, 30, 0.14)",
  rpe: "#7e3bb5",
  rpeSoft: "rgba(126, 59, 181, 0.12)",
  artBg: "#f4f1ec",
  artInk: "#262320",
  artMuscle: "#e04f2e",
  artSecondary: "#f29472",
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 20,
  xl: 28,
  num: 34,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

// Minimum touch target in dp.
export const tap = 48;
