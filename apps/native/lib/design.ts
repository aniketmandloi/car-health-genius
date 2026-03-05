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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0,
    shadowRadius: 8,
    elevation: 2,
  } satisfies ElevationStyle,

  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0,
    shadowRadius: 16,
    elevation: 6,
  } satisfies ElevationStyle,

  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: Platform.OS === "ios" ? 0.18 : 0,
    shadowRadius: 24,
    elevation: 10,
  } satisfies ElevationStyle,

  glow(color: string): ElevationStyle {
    return {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: Platform.OS === "ios" ? 0.22 : 0,
      shadowRadius: 20,
      elevation: 6,
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
  h1: { fontSize: 34, fontWeight: "800", lineHeight: 40 } satisfies TypoStyle,
  h2: { fontSize: 24, fontWeight: "700", lineHeight: 30 } satisfies TypoStyle,
  h3: { fontSize: 18, fontWeight: "700", lineHeight: 24 } satisfies TypoStyle,
  body: { fontSize: 16, fontWeight: "400", lineHeight: 24 } satisfies TypoStyle,
  caption: {
    fontSize: 12,
    fontWeight: "500",
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
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

// ─── Spacing (8px grid) ─────────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 28,
  "3xl": 36,
} as const;
