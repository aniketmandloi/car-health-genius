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
    <Container className="px-4 pb-8 pt-2">
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
      route: "/(tabs)/scan",
    },
    {
      icon: "car-outline" as const,
      label: "Garage",
      route: "/(tabs)/vehicles",
    },
    {
      icon: "time-outline" as const,
      label: "History",
      route: "/(tabs)/history",
    },
    {
      icon: "chatbubble-ellipses-outline" as const,
      label: "Support",
      route: "/support",
    },
  ];

  return (
    <View style={{ gap: 20 }}>
      <Animated.View entering={FadeInDown.duration(300).delay(20)}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 22,
              backgroundColor: colors.input,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              gap: 8,
            }}
          >
            <Ionicons name="search-outline" size={18} color={colors.textSubtle} />
            <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
              Search scans or vehicles
            </Text>
          </View>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.panel,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.textMuted} />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(50)}>
        <Card variant="accent">
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                {getGreeting()}
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 29,
                  lineHeight: 34,
                  fontWeight: "800",
                  marginTop: 4,
                }}
              >
                {session?.user?.name?.split(" ")[0] ?? "Driver"}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 7 }}>
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
                backgroundColor: colors.panel,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="log-out-outline" size={17} color={colors.textMuted} />
            </Pressable>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(80)}>
        <SectionHeader title="Quick Actions" icon="flash-outline" />
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.86}
              style={{ flex: 1, alignItems: "center" }}
              onPress={() => router.push(item.route as never)}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primary,
                }}
              >
                <Ionicons name={item.icon} size={20} color={colors.textOnPrimary} />
              </View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 12,
                  fontWeight: "600",
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {primaryVehicle && healthScore.data ? (
        <Animated.View entering={FadeInDown.duration(300).delay(120)}>
          <SectionHeader title="Vehicle Health" icon="speedometer-outline" />
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => router.push("/(tabs)/vehicles" as never)}
          >
            <Card variant="elevated">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <ProgressRing
                  score={healthScore.data.score}
                  grade={healthScore.data.grade}
                  size={80}
                  strokeWidth={6}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                    {primaryVehicle.make} {primaryVehicle.model}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>
                    Health Score {healthScore.data.score}/100
                  </Text>
                  <Text style={{ color: colors.textSubtle, fontSize: 12, marginTop: 3 }}>
                    {primaryVehicle.modelYear}
                    {primaryVehicle.mileage
                      ? ` · ${primaryVehicle.mileage.toLocaleString()} mi`
                      : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </Card>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.duration(300).delay(160)}>
        <SectionHeader title="Recent Activity" icon="pulse-outline" />
        {latestEvents.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="No recent diagnostics"
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
                    paddingVertical: 14,
                    borderBottomWidth: i < latestEvents.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: "800",
                      width: 66,
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
  const features = ["Live diagnostics", "Repair estimates", "DIY guides"];

  return (
    <View style={{ gap: 18 }}>
      <Animated.View entering={FadeInDown.duration(320).delay(30)}>
        <Card variant="accent">
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={{ width: 66, height: 66, borderRadius: 18 }}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>
                Car Health Genius
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                AI-powered vehicle diagnostics with a clean mobile-first workflow.
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 14,
            }}
          >
            {features.map((label) => (
              <Chip key={label} color="info" size="sm">
                {label}
              </Chip>
            ))}
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(320).delay(90)}>
        <Card variant="elevated">
          <View
            style={{
              flexDirection: "row",
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.input,
              padding: 4,
              marginBottom: 18,
            }}
          >
            <TouchableOpacity
              onPress={() => setAuthMode("signin")}
              activeOpacity={0.9}
              style={{
                flex: 1,
                borderRadius: 999,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor: authMode === "signin" ? colors.panel : "transparent",
              }}
            >
              <Text
                style={{
                  color: authMode === "signin" ? colors.text : colors.textMuted,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAuthMode("signup")}
              activeOpacity={0.9}
              style={{
                flex: 1,
                borderRadius: 999,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor: authMode === "signup" ? colors.panel : "transparent",
              }}
            >
              <Text
                style={{
                  color: authMode === "signup" ? colors.text : colors.textMuted,
                  fontWeight: "700",
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
