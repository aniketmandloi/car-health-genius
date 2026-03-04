import { Ionicons } from "@expo/vector-icons";
import { type PropsWithChildren } from "react";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useAppTheme } from "@/contexts/app-theme-context";
import { ELEVATION, RADIUS } from "@/lib/design";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "xs" | "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isDisabled?: boolean;
  isLoading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  onPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ButtonLabel({ children }: PropsWithChildren) {
  return <>{children}</>;
}

function Button({
  children,
  variant = "primary",
  size = "md",
  isDisabled,
  isLoading,
  icon,
  iconPosition = "left",
  onPress,
  className,
  style,
}: PropsWithChildren<ButtonProps>) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeStyles: Record<
    ButtonSize,
    { minHeight: number; px: number; py: number; fontSize: number; iconSize: number }
  > = {
    xs: { minHeight: 30, px: 10, py: 4, fontSize: 12, iconSize: 14 },
    sm: { minHeight: 38, px: 14, py: 8, fontSize: 13, iconSize: 16 },
    md: { minHeight: 46, px: 18, py: 11, fontSize: 15, iconSize: 18 },
    lg: { minHeight: 54, px: 22, py: 14, fontSize: 16, iconSize: 20 },
  };

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: `${colors.primaryPressed}CC`,
      ...ELEVATION.glow(colors.primary),
    },
    secondary: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    ghost: {
      backgroundColor: "transparent",
    },
    danger: {
      backgroundColor: colors.danger,
      borderWidth: 1,
      borderColor: `${colors.danger}CC`,
      ...ELEVATION.glow(colors.danger),
    },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
  };

  const textColor: Record<ButtonVariant, string> = {
    primary: colors.textOnPrimary,
    secondary: colors.text,
    ghost: colors.textMuted,
    danger: colors.textOnPrimary,
    outline: colors.text,
  };

  const s = sizeStyles[size];
  const disabled = isDisabled || isLoading;
  const isStringChild =
    typeof children === "string" || typeof children === "number";

  function handlePressIn() {
    scale.value = withSpring(0.97, { damping: 16, stiffness: 330 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 16, stiffness: 330 });
  }

  function handlePress() {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      Haptics.impactAsync(
        variant === "primary" || variant === "danger"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
    }
    onPress?.();
  }

  const iconEl = icon ? (
    <Ionicons
      name={icon}
      size={s.iconSize}
      color={textColor[variant]}
      style={iconPosition === "left" ? { marginRight: 7 } : { marginLeft: 7 }}
    />
  ) : null;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      className={className}
      style={[
        animatedStyle,
        variantStyles[variant],
        {
          minHeight: s.minHeight,
          paddingHorizontal: s.px,
          paddingVertical: s.py,
          borderRadius: RADIUS.md,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={textColor[variant]} />
      ) : (
        <>
          {iconPosition === "left" && iconEl}
          {isStringChild ? (
            <Text
              style={{
                color: textColor[variant],
                fontSize: s.fontSize,
                fontWeight: "700",
                letterSpacing: 0.2,
              }}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {iconPosition === "right" && iconEl}
        </>
      )}
    </AnimatedPressable>
  );
}

Button.Label = ButtonLabel;

export { Button };
