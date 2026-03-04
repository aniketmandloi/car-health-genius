import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { Appearance } from "react-native";
import { Uniwind, useUniwind } from "uniwind";

type ThemeName = "light" | "dark";

type AppColors = {
  background: string;
  panel: string;
  input: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textOnPrimary: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  track: string;
  surfaceElevated: string;
  surfaceRecessed: string;
  shadow: string;
  shadowLight: string;
  auraPrimary: string;
  auraSecondary: string;
  tabBar: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;
  header: string;
  headerText: string;
};

const LIGHT_COLORS: AppColors = {
  background: "#EDF3FA",
  panel: "#FFFFFF",
  input: "#F2F6FC",
  border: "rgba(15,23,42,0.10)",
  borderStrong: "rgba(15,23,42,0.18)",
  text: "#0B1729",
  textMuted: "#4B5D75",
  textSubtle: "#6D7F98",
  textOnPrimary: "#FFFFFF",
  primary: "#069FBE",
  primaryPressed: "#0282A0",
  primarySoft: "rgba(6,159,190,0.14)",
  secondary: "#3E6AF4",
  success: "#159A72",
  warning: "#C57D1D",
  danger: "#DE5368",
  info: "#4E7DFF",
  track: "rgba(15,23,42,0.13)",
  surfaceElevated: "#FFFFFF",
  surfaceRecessed: "#E6EDF7",
  shadow: "rgba(15,23,42,0.08)",
  shadowLight: "rgba(15,23,42,0.04)",
  auraPrimary: "rgba(6,159,190,0.18)",
  auraSecondary: "rgba(62,106,244,0.14)",
  tabBar: "#0C1A30",
  tabBarBorder: "rgba(255,255,255,0.12)",
  tabActive: "#86E9FF",
  tabInactive: "rgba(219,232,250,0.74)",
  header: "#F7FAFF",
  headerText: "#0B1729",
};

const DARK_COLORS: AppColors = {
  background: "#070F1D",
  panel: "#101B30",
  input: "#17243A",
  border: "rgba(165,186,214,0.24)",
  borderStrong: "rgba(200,220,245,0.36)",
  text: "#F2F7FF",
  textMuted: "#A8B9D2",
  textSubtle: "#7F96B3",
  textOnPrimary: "#FFFFFF",
  primary: "#3AD3F3",
  primaryPressed: "#1FBBDD",
  primarySoft: "rgba(58,211,243,0.16)",
  secondary: "#7EA2FF",
  success: "#3AD29A",
  warning: "#FFB447",
  danger: "#FF6C7B",
  info: "#82A4FF",
  track: "rgba(168,185,210,0.24)",
  surfaceElevated: "#14233A",
  surfaceRecessed: "#0C162A",
  shadow: "rgba(0,0,0,0.45)",
  shadowLight: "rgba(0,0,0,0.22)",
  auraPrimary: "rgba(58,211,243,0.18)",
  auraSecondary: "rgba(126,162,255,0.14)",
  tabBar: "#091226",
  tabBarBorder: "rgba(152,180,217,0.26)",
  tabActive: "#9CEFFF",
  tabInactive: "rgba(172,194,222,0.72)",
  header: "#0A162B",
  headerText: "#F2F7FF",
};

type AppThemeContextType = {
  currentTheme: string;
  isLight: boolean;
  isDark: boolean;
  colors: AppColors;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(
  undefined,
);

export const AppThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { theme } = useUniwind();
  const systemTheme = Appearance.getColorScheme() === "dark" ? "dark" : "light";
  const resolvedTheme: ThemeName =
    theme === "dark" || theme === "light" ? theme : systemTheme;

  useEffect(() => {
    if (theme !== "dark" && theme !== "light") {
      Uniwind.setTheme(systemTheme);
    }
  }, [theme, systemTheme]);

  const isLight = useMemo(() => {
    return resolvedTheme === "light";
  }, [resolvedTheme]);

  const isDark = useMemo(() => {
    return resolvedTheme === "dark";
  }, [resolvedTheme]);

  const colors = useMemo(() => {
    return isDark ? DARK_COLORS : LIGHT_COLORS;
  }, [isDark]);

  const setTheme = useCallback((newTheme: ThemeName) => {
    Uniwind.setTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    Uniwind.setTheme(resolvedTheme === "light" ? "dark" : "light");
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      currentTheme: resolvedTheme,
      isLight,
      isDark,
      colors,
      setTheme,
      toggleTheme,
    }),
    [resolvedTheme, isLight, isDark, colors, setTheme, toggleTheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
};

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
