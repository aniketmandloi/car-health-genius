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
  background: "#F7F9FC",
  panel: "#FFFFFF",
  input: "#EEF1F5",
  border: "rgba(15,23,42,0.08)",
  borderStrong: "rgba(15,23,42,0.14)",
  text: "#0A0B0D",
  textMuted: "#586172",
  textSubtle: "#7C8594",
  textOnPrimary: "#FFFFFF",
  primary: "#0052FF",
  primaryPressed: "#003DBC",
  primarySoft: "rgba(0,82,255,0.10)",
  secondary: "#2D66F6",
  success: "#098551",
  warning: "#A76315",
  danger: "#CC334D",
  info: "#3B82F6",
  track: "rgba(15,23,42,0.12)",
  surfaceElevated: "#FFFFFF",
  surfaceRecessed: "#F2F5FA",
  shadow: "rgba(17,24,39,0.10)",
  shadowLight: "rgba(17,24,39,0.04)",
  auraPrimary: "rgba(0,82,255,0.08)",
  auraSecondary: "rgba(26,132,255,0.06)",
  tabBar: "#F7F9FC",
  tabBarBorder: "rgba(15,23,42,0.08)",
  tabActive: "#0052FF",
  tabInactive: "#8A94A4",
  header: "#FFFFFF",
  headerText: "#0A0B0D",
};

const DARK_COLORS: AppColors = {
  background: "#090B0E",
  panel: "#12151B",
  input: "#1A1F27",
  border: "rgba(162,174,198,0.24)",
  borderStrong: "rgba(183,197,219,0.34)",
  text: "#F4F7FF",
  textMuted: "#B4BECE",
  textSubtle: "#8B97AA",
  textOnPrimary: "#FFFFFF",
  primary: "#4C8DFF",
  primaryPressed: "#2A6EF1",
  primarySoft: "rgba(76,141,255,0.20)",
  secondary: "#6EA2FF",
  success: "#2BB67A",
  warning: "#D7903E",
  danger: "#FF6D85",
  info: "#8BAEFF",
  track: "rgba(168,185,210,0.24)",
  surfaceElevated: "#141A23",
  surfaceRecessed: "#0E131B",
  shadow: "rgba(0,0,0,0.45)",
  shadowLight: "rgba(0,0,0,0.30)",
  auraPrimary: "rgba(76,141,255,0.16)",
  auraSecondary: "rgba(116,175,255,0.10)",
  tabBar: "#090B0E",
  tabBarBorder: "rgba(169,186,216,0.18)",
  tabActive: "#9EC1FF",
  tabInactive: "#7F8EA4",
  header: "#0D1118",
  headerText: "#F4F7FF",
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
