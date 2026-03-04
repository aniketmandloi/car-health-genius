import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Toast from "react-native-toast-message";

import { AppThemeProvider, useAppTheme } from "@/contexts/app-theme-context";
import { queryClient } from "@/utils/trpc";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function StackLayout() {
  const { colors, isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.header} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerTitleStyle: {
            color: colors.headerText,
            fontWeight: "700",
            fontSize: 17,
          },
          headerTintColor: colors.headerText,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ title: "Modal", presentation: "modal" }}
        />
        <Stack.Screen
          name="scan-results"
          options={{ title: "Scan Results" }}
        />
        <Stack.Screen
          name="results/[diagnosticEventId]"
          options={{ title: "Diagnostic Detail" }}
        />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppThemeProvider>
            <StackLayout />
            <Toast />
          </AppThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
