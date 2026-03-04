import { Tabs } from "expo-router";

import { CustomTabBar } from "@/components/custom-tab-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.header,
        },
        headerShadowVisible: true,
        headerTintColor: colors.headerText,
        headerTitleAlign: "center",
        headerTitleStyle: {
          color: colors.headerText,
          fontWeight: "700",
          fontSize: 17,
        },
        headerRight: () => <ThemeToggle />,
        headerRightContainerStyle: {
          paddingRight: 12,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="vehicles" options={{ title: "Vehicles" }} />
      <Tabs.Screen name="pricing" options={{ title: "Pro" }} />
    </Tabs>
  );
}
