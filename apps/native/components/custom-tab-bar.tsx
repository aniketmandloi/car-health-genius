import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/app-theme-context";
import { ELEVATION } from "@/lib/design";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TabBarProps = any;

const TAB_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  index: { icon: "home", label: "Home" },
  history: { icon: "time-outline", label: "History" },
  scan: { icon: "scan-outline", label: "Scan" },
  vehicles: { icon: "car-outline", label: "Vehicles" },
  pricing: { icon: "diamond-outline", label: "Pro" },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScanButton({ onPress, focused }: { onPress: () => void; focused: boolean }) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS === "ios" || Platform.OS === "android") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.93, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 320 });
      }}
      style={[
        animStyle,
        {
          width: 62,
          height: 62,
          borderRadius: 31,
          alignItems: "center",
          justifyContent: "center",
          marginTop: -30,
          backgroundColor: focused ? colors.primaryPressed : colors.primary,
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.86)",
          ...ELEVATION.glow(colors.primary),
        },
      ]}
    >
      <Ionicons name="scan-outline" size={28} color="#FFFFFF" />
    </AnimatedPressable>
  );
}

export function CustomTabBar({
  state,
  navigation,
}: TabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const orderedRoutes = ["index", "history", "scan", "vehicles", "pricing"];

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: insets.bottom > 0 ? insets.bottom - 2 : 8,
        backgroundColor: "transparent",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.tabBarBorder,
          backgroundColor: colors.tabBar,
          paddingHorizontal: 8,
          paddingTop: 10,
          paddingBottom: 10,
          ...ELEVATION.lg,
        }}
      >
        {orderedRoutes.map((routeName) => {
          const routeIndex = state.routes.findIndex(
            (r: { name: string }) => r.name === routeName,
          );
          if (routeIndex === -1) return null;

          const route = state.routes[routeIndex]!;
          const config = TAB_CONFIG[routeName];
          if (!config) return null;

          const isFocused = state.index === routeIndex;
          const isScan = routeName === "scan";

          function onPress() {
            if (Platform.OS === "ios" || Platform.OS === "android") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          if (isScan) {
            return (
              <View key={routeName} style={{ flex: 1, alignItems: "center" }}>
                <ScanButton onPress={onPress} focused={isFocused} />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: isFocused ? colors.tabActive : colors.tabInactive,
                    marginTop: 3,
                  }}
                >
                  {config.label}
                </Text>
              </View>
            );
          }

          return (
            <Pressable
              key={routeName}
              onPress={onPress}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 2,
                gap: 3,
              }}
            >
              <Ionicons
                name={config.icon}
                size={21}
                color={isFocused ? colors.tabActive : colors.tabInactive}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isFocused ? "700" : "600",
                  color: isFocused ? colors.tabActive : colors.tabInactive,
                }}
              >
                {config.label}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isFocused ? colors.tabActive : "transparent",
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
