import { ActivityIndicator } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";

type SpinnerProps = {
  size?: "sm" | "lg";
  color?: string;
};

export function Spinner({ size = "lg" }: SpinnerProps) {
  const { colors } = useAppTheme();
  return (
    <ActivityIndicator
      size={size === "sm" ? "small" : "large"}
      color={colors.primary}
    />
  );
}
