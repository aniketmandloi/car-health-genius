import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { ThemeToggle } from "@/components/theme-toggle";

const DARK_BG = "#0B1120";
const TEAL = "#06B6D4";
const SLATE_500 = "#64748B";
const SLATE_50 = "#F1F5F9";
const BORDER_SUBTLE = "rgba(255,255,255,0.08)";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: DARK_BG,
        },
        headerTintColor: SLATE_50,
        headerTitleStyle: {
          color: SLATE_50,
          fontWeight: "700",
        },
        headerRight: () => <ThemeToggle />,
        tabBarStyle: {
          backgroundColor: DARK_BG,
          borderTopWidth: 1,
          borderTopColor: BORDER_SUBTLE,
          elevation: 0,
          shadowColor: "transparent",
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: TEAL,
        tabBarInactiveTintColor: SLATE_500,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pricing"
        options={{
          title: "Pricing",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: "Vehicles",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
