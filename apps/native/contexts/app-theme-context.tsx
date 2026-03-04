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
  text: string;
  textMuted: string;
  textSubtle: string;
  textOnPrimary: string;
  primary: string;
  primarySoft: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  track: string;
};

const LIGHT_COLORS: AppColors = {
  background: "#F3F8FC",
  panel: "#FFFFFF",
  input: "#EDF3F9",
  border: "rgba(15,23,42,0.12)",
  text: "#0F172A",
  textMuted: "#475569",
  textSubtle: "#64748B",
  textOnPrimary: "#FFFFFF",
  primary: "#06B6D4",
  primarySoft: "rgba(6,182,212,0.14)",
  secondary: "#8B5CF6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  track: "rgba(15,23,42,0.12)",
};

const DARK_COLORS: AppColors = {
  background: "#081323",
  panel: "#0F1A2E",
  input: "#162032",
  border: "rgba(255,255,255,0.12)",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textSubtle: "#64748B",
  textOnPrimary: "#FFFFFF",
  primary: "#06B6D4",
  primarySoft: "rgba(6,182,212,0.16)",
  secondary: "#8B5CF6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  track: "rgba(255,255,255,0.10)",
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
