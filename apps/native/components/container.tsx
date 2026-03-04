import { cn } from "@/lib/cn";
import { type PropsWithChildren } from "react";
import {
  StyleSheet,
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import Animated, { type AnimatedProps } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/contexts/app-theme-context";

const AnimatedView = Animated.createAnimatedComponent(View);

type Props = AnimatedProps<ViewProps> & {
  className?: string;
  isScrollable?: boolean;
  variant?: "default" | "plain";
  header?: React.ReactNode;
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle">;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Container({
  children,
  className,
  isScrollable = true,
  variant = "default",
  header,
  scrollViewProps,
  refreshing,
  onRefresh,
  style,
  ...props
}: PropsWithChildren<Props>) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <AnimatedView
      className={cn("flex-1", className)}
      style={[
        {
          backgroundColor: colors.background,
          paddingBottom: insets.bottom,
        },
        style,
      ]}
      {...props}
    >
      {variant === "default" && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <View
            style={{
              position: "absolute",
              left: -130,
              top: -170,
              width: 360,
              height: 360,
              borderRadius: 180,
              backgroundColor: colors.auraPrimary,
            }}
          />
          <View
            style={{
              position: "absolute",
              right: -120,
              top: 120,
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: colors.auraSecondary,
            }}
          />
          <View
            style={{
              position: "absolute",
              right: 32,
              bottom: 52,
              width: 170,
              height: 170,
              borderRadius: 85,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </View>
      )}
      {header}
      {isScrollable ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
            ) : undefined
          }
          {...scrollViewProps}
        >
          <View className="relative z-10 flex-1">{children}</View>
        </ScrollView>
      ) : (
        <View className="relative z-10 flex-1">{children}</View>
      )}
    </AnimatedView>
  );
}
