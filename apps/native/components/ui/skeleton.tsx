import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "@/contexts/app-theme-context";
import { RADIUS } from "@/lib/design";

type SkeletonVariant = "text" | "circular" | "rectangular";

type SkeletonProps = {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number;
  style?: object;
};

export function Skeleton({
  variant = "text",
  width,
  height,
  style,
}: SkeletonProps) {
  const { colors } = useAppTheme();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 680 }),
        withTiming(0.45, { duration: 680 }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const dimensions = (() => {
    switch (variant) {
      case "circular":
        return {
          width: width ?? 40,
          height: height ?? 40,
          borderRadius: 9999,
        };
      case "rectangular":
        return {
          width: width ?? "100%",
          height: height ?? 80,
          borderRadius: RADIUS.md,
        };
      case "text":
      default:
        return {
          width: width ?? "100%",
          height: height ?? 14,
          borderRadius: RADIUS.sm,
        };
    }
  })();

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.input,
          ...dimensions,
        },
        animStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: RADIUS.lg,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Skeleton variant="circular" width={42} height={42} />
        <View style={{ flex: 1, gap: 7 }}>
          <Skeleton variant="text" width="58%" height={13} />
          <Skeleton variant="text" width="34%" height={10} />
        </View>
      </View>
      <Skeleton variant="text" width="100%" height={12} />
      <Skeleton variant="text" width="84%" height={12} />
      <Skeleton variant="text" width="62%" height={12} />
    </View>
  );
}
