import { useColorScheme } from "react-native";

import { dark, fontSize, light, radius, space, tap, type Palette } from "./tokens";

export type Theme = {
  scheme: "light" | "dark";
  colors: Palette;
  fontSize: typeof fontSize;
  space: typeof space;
  radius: typeof radius;
  tap: number;
};

const darkTheme: Theme = { scheme: "dark", colors: dark, fontSize, space, radius, tap };
const lightTheme: Theme = { scheme: "light", colors: light, fontSize, space, radius, tap };

// Follows the system setting. Dark is the prototype default, so an unknown scheme maps to dark.
export function useTheme(): Theme {
  return useColorScheme() === "light" ? lightTheme : darkTheme;
}
