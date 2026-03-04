import { type PropsWithChildren } from "react";
import { Text, View, type ViewProps } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import { cn } from "@/lib/cn";

type CardProps = ViewProps & {
  variant?: "primary" | "secondary";
  className?: string;
};

function CardTitle({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <Text className={cn("text-foreground font-bold text-base", className)}>
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
    <Text
      className={cn("text-sm", className)}
      style={{ color: colors.textMuted }}
    >
      {children}
    </Text>
  );
}

function Card({
  children,
  className,
  style,
  ...props
}: PropsWithChildren<CardProps>) {
  const { colors } = useAppTheme();

  return (
    <View
      className={cn("rounded-2xl", className)}
      style={[{ backgroundColor: colors.panel }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

Card.Title = CardTitle;
Card.Description = CardDescription;

export { Card };
