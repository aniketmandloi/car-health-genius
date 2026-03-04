import { Platform, type ViewStyle } from "react-native";

// ─── Elevation (shadow presets) ─────────────────────────────────────────────

type ElevationStyle = Pick<
  ViewStyle,
  | "shadowColor"
  | "shadowOffset"
  | "shadowOpacity"
  | "shadowRadius"
  | "elevation"
>;

export const ELEVATION = {
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0,
    shadowRadius: 4,
    elevation: 2,
  } satisfies ElevationStyle,

  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0,
    shadowRadius: 10,
    elevation: 5,
  } satisfies ElevationStyle,

  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: Platform.OS === "ios" ? 0.2 : 0,
    shadowRadius: 18,
    elevation: 9,
  } satisfies ElevationStyle,

  glow(color: string): ElevationStyle {
    return {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: Platform.OS === "ios" ? 0.36 : 0,
      shadowRadius: 14,
      elevation: 7,
    };
  },
};

// ─── Typography Scale ───────────────────────────────────────────────────────

type TypoStyle = {
  fontSize: number;
  fontWeight:
    | "400"
    | "500"
    | "600"
    | "700"
    | "800";
  lineHeight: number;
};

export const TYPO = {
  h1: { fontSize: 32, fontWeight: "800", lineHeight: 38 } satisfies TypoStyle,
  h2: { fontSize: 22, fontWeight: "700", lineHeight: 28 } satisfies TypoStyle,
  h3: { fontSize: 17, fontWeight: "700", lineHeight: 23 } satisfies TypoStyle,
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 } satisfies TypoStyle,
  caption: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  } satisfies TypoStyle,
  micro: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  } satisfies TypoStyle,
};

// ─── Radius Presets ─────────────────────────────────────────────────────────

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

// ─── Spacing (8px grid) ─────────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;
