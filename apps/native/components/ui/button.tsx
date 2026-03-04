import { type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "default";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isDisabled?: boolean;
  onPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

function ButtonLabel({ children }: PropsWithChildren) {
  return <>{children}</>;
}

function Button({
  children,
  variant = "primary",
  size = "default",
  isDisabled,
  onPress,
  className,
  style,
}: PropsWithChildren<ButtonProps>) {
  const { colors } = useAppTheme();

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.primary },
    secondary: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ghost: { backgroundColor: "transparent" },
  };

  const textColor: Record<ButtonVariant, string> = {
    primary: colors.textOnPrimary,
    secondary: colors.text,
    ghost: colors.text,
  };

  const padding =
    size === "sm"
      ? { paddingHorizontal: 12, paddingVertical: 6 }
      : { paddingHorizontal: 16, paddingVertical: 11 };

  const fontSize = size === "sm" ? 13 : 15;

  const isStringChild =
    typeof children === "string" || typeof children === "number";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={className}
      style={({ pressed }) => [
        variantStyles[variant],
        padding,
        {
          borderRadius: 12,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          flexDirection: "row" as const,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {isStringChild ? (
        <Text
          style={{
            color: textColor[variant],
            fontSize,
            fontWeight: "600",
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

Button.Label = ButtonLabel;

export { Button };
