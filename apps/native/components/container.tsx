import { cn } from "@/lib/cn";
import { type PropsWithChildren } from "react";
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import Animated, { type AnimatedProps } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedView = Animated.createAnimatedComponent(View);

type Props = AnimatedProps<ViewProps> & {
  className?: string;
  isScrollable?: boolean;
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle">;
};

export function Container({
  children,
  className,
  isScrollable = true,
  scrollViewProps,
  ...props
}: PropsWithChildren<Props>) {
  const insets = useSafeAreaInsets();

  return (
    <AnimatedView
      className={cn("flex-1 bg-surface-base", className)}
      style={{
        paddingBottom: insets.bottom,
      }}
      {...props}
    >
      <View pointerEvents="none" className="absolute inset-0">
        <View className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-brand-teal/12" />
        <View className="absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-brand-violet/10" />
      </View>
      {isScrollable ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
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
