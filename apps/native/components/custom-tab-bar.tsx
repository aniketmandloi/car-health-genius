import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/app-theme-context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TabBarProps = any;

const TAB_CONFIG: Record<
  string,
  {
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  index: { icon: "home-outline", activeIcon: "home", label: "Home" },
  history: { icon: "list-outline", activeIcon: "list", label: "History" },
  scan: {
    icon: "speedometer-outline",
    activeIcon: "speedometer",
    label: "Scan",
  },
  vehicles: { icon: "car-sport-outline", activeIcon: "car-sport", label: "Vehicles" },
  pricing: { icon: "star-outline", activeIcon: "star", label: "Pro" },
};

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
        paddingHorizontal: 8,
        paddingTop: 6,
        paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 10,
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 4,
          paddingVertical: 6,
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

          return (
            <Pressable
              key={routeName}
              onPress={onPress}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                paddingVertical: 4,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isFocused ? colors.primarySoft : "transparent",
                }}
              >
                <Ionicons
                  name={isFocused ? config.activeIcon : config.icon}
                  size={18}
                  color={isFocused ? colors.tabActive : colors.tabInactive}
                />
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: isFocused ? "700" : "600",
                  color: isFocused ? colors.tabActive : colors.tabInactive,
                }}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
