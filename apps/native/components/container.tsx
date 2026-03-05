import { cn } from "@/lib/cn";
import { type PropsWithChildren } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import Animated, { type AnimatedProps } from "react-native-reanimated";
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
  const { colors } = useAppTheme();

  return (
    <AnimatedView
      className={cn("flex-1", className)}
      style={[
        {
          backgroundColor: variant === "plain" ? colors.panel : colors.background,
        },
        style,
      ]}
      {...props}
    >
      {header}
      {isScrollable ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
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
