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
  over: string;
  overSoft: string;
  estimate: string;
  estimateSoft: string;
  protein: string;
  carbs: string;
  fat: string;
  track: string;
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
  over: "#f0605a",
  overSoft: "rgba(240, 96, 90, 0.14)",
  estimate: "#e8b44a",
  estimateSoft: "rgba(232, 180, 74, 0.14)",
  protein: "#6aa8f0",
  carbs: "#e8b44a",
  fat: "#c58af0",
  track: "#2e2a26",
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
  over: "#d23f39",
  overSoft: "rgba(210, 63, 57, 0.1)",
  estimate: "#9a6a08",
  estimateSoft: "rgba(212, 150, 30, 0.14)",
  protein: "#2f7bd6",
  carbs: "#c98a0c",
  fat: "#9b55d0",
  track: "#ebe5de",
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
