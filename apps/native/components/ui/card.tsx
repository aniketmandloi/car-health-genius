import { type PropsWithChildren } from "react";
import { Platform, Text, View, type ViewProps } from "react-native";

import { cn } from "@/lib/cn";
import { useAppTheme } from "@/contexts/app-theme-context";
import { ELEVATION, RADIUS } from "@/lib/design";

type CardVariant = "default" | "elevated" | "outlined" | "accent" | "recessed";

type CardProps = ViewProps & {
  variant?: CardVariant;
  noPadding?: boolean;
  className?: string;
};

function CardHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { colors } = useAppTheme();

  return (
    <View className="mb-3 flex-row items-center gap-3">
      {icon}
      <View className="flex-1">
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

function CardTitle({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  const { colors } = useAppTheme();

  return (
    <Text className={cn(className)} style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
      {children}
    </Text>
  );
}

function CardDescription({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  const { colors } = useAppTheme();

  return (
    <Text className={cn(className)} style={{ color: colors.textMuted, fontSize: 13 }}>
      {children}
    </Text>
  );
}

function Card({
  children,
  variant = "default",
  noPadding,
  className,
  style,
  ...props
}: PropsWithChildren<CardProps>) {
  const { colors, isDark } = useAppTheme();

  const variantStyles = (() => {
    switch (variant) {
      case "elevated":
        return {
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border,
          ...ELEVATION.md,
        };
      case "outlined":
        return {
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.borderStrong,
        };
      case "accent":
        return {
          backgroundColor: isDark ? colors.surfaceElevated : colors.panel,
          borderWidth: 1,
          borderColor: `${colors.primary}66`,
          borderTopWidth: 2,
          borderTopColor: colors.primary,
          ...ELEVATION.sm,
        };
      case "recessed":
        return {
          backgroundColor: colors.surfaceRecessed,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case "default":
      default:
        return {
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.border,
          ...(Platform.OS === "ios" ? ELEVATION.sm : {}),
          ...(Platform.OS === "android" ? { elevation: 2 } : {}),
        };
    }
  })();

  return (
    <View
      className={cn(className)}
      style={[
        {
          borderRadius: RADIUS.lg,
          padding: noPadding ? 0 : 16,
          overflow: "hidden",
        },
        variantStyles,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Header = CardHeader;

export { Card };
