import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SectionHeader } from "@/components/ui/section-header";
import { useAppTheme } from "@/contexts/app-theme-context";
import { TYPO } from "@/lib/design";
import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getSeverityColor(
  severity: string,
): "success" | "warning" | "danger" | "default" {
  switch (severity) {
    case "critical":
    case "high":
      return "danger";
    case "medium":
      return "warning";
    case "low":
      return "success";
    default:
      return "default";
  }
}

export default function Home() {
  const { data: session } = authClient.useSession();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  return (
    <Container className="px-5 pb-8 pt-4">
      {session?.user ? (
        <AuthenticatedHome />
      ) : (
        <UnauthenticatedHome authMode={authMode} setAuthMode={setAuthMode} />
      )}
    </Container>
  );
}

function AuthenticatedHome() {
  const { data: session } = authClient.useSession();
  const { colors } = useAppTheme();
  const router = useRouter();

  const vehicles = useQuery(trpc.vehicles.list.queryOptions());
  const primaryVehicle = vehicles.data?.[0];

  const healthScore = useQuery({
    ...trpc.maintenance.getHealthScore.queryOptions({
      vehicleId: primaryVehicle?.id ?? 0,
    }),
    enabled: !!primaryVehicle,
  });

  const recentEvents = useQuery({
    ...trpc.diagnostics.listByVehicle.queryOptions({
      vehicleId: primaryVehicle?.id ?? 0,
    }),
    enabled: !!primaryVehicle,
  });

  const latestEvents = (recentEvents.data ?? []).slice(0, 4);

  const quickActions = [
    {
      icon: "scan-outline" as const,
      label: "Start Scan",
      subtitle: "Run live diagnostics",
      route: "/(tabs)/scan",
      accent: colors.primary,
    },
    {
      icon: "car-sport-outline" as const,
      label: "Garage",
      subtitle: "Manage vehicles",
      route: "/(tabs)/vehicles",
      accent: colors.secondary,
    },
    {
      icon: "time-outline" as const,
      label: "History",
      subtitle: "See prior events",
      route: "/(tabs)/history",
      accent: colors.info,
    },
    {
      icon: "chatbubble-ellipses-outline" as const,
      label: "Support",
      subtitle: "Get help quickly",
      route: "/support",
      accent: colors.warning,
    },
  ];

  return (
    <View className="gap-5">
      <Animated.View entering={FadeInDown.duration(340).delay(40)}>
        <Card variant="accent">
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <Text style={{ ...TYPO.h2, color: colors.text }}>
                {getGreeting()},
              </Text>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 24,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                {session?.user?.name?.split(" ")[0] ?? "Driver"}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 5 }}>
                {primaryVehicle
                  ? `${primaryVehicle.make} ${primaryVehicle.model}`
                  : "Add a vehicle to unlock personalized diagnostics."}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                authClient.signOut();
                queryClient.invalidateQueries();
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.input,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </Card>
      </Animated.View>

      {primaryVehicle && healthScore.data ? (
        <Animated.View entering={FadeInDown.duration(340).delay(90)}>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => router.push("/(tabs)/vehicles" as never)}
          >
            <Card variant="elevated">
              <View className="flex-row items-center gap-4">
                <ProgressRing
                  score={healthScore.data.score}
                  grade={healthScore.data.grade}
                  size={78}
                  strokeWidth={6}
                />
                <View className="flex-1">
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>
                    {primaryVehicle.make} {primaryVehicle.model}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    Health Score {healthScore.data.score}/100
                  </Text>
                  <Text style={{ color: colors.textSubtle, fontSize: 11, marginTop: 2 }}>
                    {primaryVehicle.modelYear}
                    {primaryVehicle.mileage
                      ? ` · ${primaryVehicle.mileage.toLocaleString()} mi`
                      : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Card>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.duration(340).delay(130)}>
        <SectionHeader title="Quick Actions" icon="flash-outline" />
        <View className="mt-1 flex-row flex-wrap gap-3">
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.86}
              style={{ width: "48%" }}
              onPress={() => router.push(item.route as never)}
            >
              <Card variant="default" noPadding>
                <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: `${item.accent}20`,
                      borderWidth: 1,
                      borderColor: `${item.accent}55`,
                    }}
                  >
                    <Ionicons name={item.icon} size={20} color={item.accent} />
                  </View>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: "700",
                      marginTop: 10,
                    }}
                  >
                    {item.label}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    {item.subtitle}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(340).delay(180)}>
        <SectionHeader title="Recent Activity" icon="pulse-outline" />
        {latestEvents.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="No Recent DTC Events"
            description="Run your first scan and your diagnostic timeline will appear here."
          />
        ) : (
          <Card variant="default" noPadding>
            {latestEvents.map((event, i) => (
              <TouchableOpacity
                key={event.id}
                activeOpacity={0.84}
                onPress={() => router.push(`/results/${event.id}` as never)}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 15,
                    paddingVertical: 13,
                    borderBottomWidth: i < latestEvents.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: "800",
                      width: 64,
                    }}
                  >
                    {event.dtcCode}
                  </Text>
                  <Chip color={getSeverityColor(event.severity)} size="sm">
                    {event.severity}
                  </Chip>
                  <Text
                    style={{
                      color: colors.textSubtle,
                      fontSize: 11,
                      marginLeft: "auto",
                    }}
                  >
                    {new Date(event.occurredAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </Animated.View>
    </View>
  );
}

function UnauthenticatedHome({
  authMode,
  setAuthMode,
}: {
  authMode: "signin" | "signup";
  setAuthMode: (mode: "signin" | "signup") => void;
}) {
  const { colors } = useAppTheme();

  const features = ["AI Diagnostics", "Repair Estimates", "DIY Guides"];

  return (
    <View className="gap-5">
      <Animated.View entering={FadeInDown.duration(340).delay(40)}>
        <View className="items-center pt-3">
          <View
            style={{
              width: 86,
              height: 86,
              borderRadius: 24,
              backgroundColor: colors.panel,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={require("../../assets/images/logo.png")}
              style={{ width: 64, height: 64, borderRadius: 16 }}
              resizeMode="cover"
            />
          </View>
          <Text
            style={{
              ...TYPO.h1,
              color: colors.text,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            Car <Text style={{ color: colors.primary }}>Health</Text> Genius
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 14,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            Smarter diagnostics for modern vehicles.
          </Text>
          <View className="mt-4 flex-row flex-wrap justify-center gap-2">
            {features.map((label) => (
              <View
                key={label}
                style={{
                  backgroundColor: colors.primarySoft,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: `${colors.primary}55`,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(340).delay(100)}>
        <Card variant="elevated">
          <View
            style={{
              flexDirection: "row",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.input,
              padding: 4,
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              onPress={() => setAuthMode("signin")}
              activeOpacity={0.86}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor: authMode === "signin" ? colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  color: authMode === "signin" ? colors.textOnPrimary : colors.textMuted,
                  fontWeight: "800",
                  fontSize: 13,
                }}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAuthMode("signup")}
              activeOpacity={0.86}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor: authMode === "signup" ? colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  color: authMode === "signup" ? colors.textOnPrimary : colors.textMuted,
                  fontWeight: "800",
                  fontSize: 13,
                }}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
          {authMode === "signin" ? <SignIn /> : <SignUp />}
        </Card>
      </Animated.View>
    </View>
  );
}
