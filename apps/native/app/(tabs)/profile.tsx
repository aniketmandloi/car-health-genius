import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

function titleCasePlan(plan: string | undefined): string {
  if (!plan) return "Free";
  return plan
    .split(/[_\s-]+/g)
    .filter((part) => part.length > 0)
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function ProfileTab() {
  const { colors, currentTheme } = useAppTheme();
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const entitlements = useQuery({
    ...trpc.billing.getEntitlements.queryOptions(),
    enabled: !!session?.user,
  });

  const supportPriority = useQuery({
    ...trpc.billing.getSupportPriority.queryOptions(),
    enabled: !!session?.user,
  });

  const plan = titleCasePlan(entitlements.data?.plan);
  const hasProAccess = (entitlements.data?.features ?? []).some((feature) =>
    feature.featureKey.startsWith("pro."),
  );

  if (!session?.user) {
    return (
      <Container className="px-4 pt-2">
        <Card variant="default">
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            Sign in to open your profile
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6 }}>
            Manage appearance and account preferences from this tab.
          </Text>
          <Button
            style={{ marginTop: 14 }}
            onPress={() => router.push("/")}
          >
            Go to Home
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="px-4 pt-2">
      <View style={{ gap: 16 }}>
        <Animated.View entering={FadeInDown.duration(260)}>
          <Card variant="accent">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.panel,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="person" size={22} color={colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                  {session.user.name ?? "Driver"}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {session.user.email}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(260).delay(40)}>
          <Card variant="default">
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
              Appearance
            </Text>
            <View
              style={{
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  Theme
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Current: {currentTheme === "dark" ? "Dark" : "Light"}
                </Text>
              </View>
              <ThemeToggle />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(260).delay(80)}>
          <Card variant="default">
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
              Membership
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>
              Plan: {plan}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
              Support tier:{" "}
              {supportPriority.data?.priorityTier === "priority"
                ? "Priority"
                : "Standard"}
            </Text>
            {!hasProAccess ? (
              <Button
                style={{ marginTop: 14 }}
                onPress={() => router.push("/pricing")}
              >
                Upgrade to Pro
              </Button>
            ) : null}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(260).delay(120)}>
          <Card variant="default">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/support")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  Support
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
            </TouchableOpacity>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(260).delay(160)}>
          <Button
            variant="outline"
            icon="log-out-outline"
            onPress={() => {
              authClient.signOut();
              queryClient.invalidateQueries();
              router.push("/");
            }}
          >
            Sign Out
          </Button>
        </Animated.View>
      </View>
    </Container>
  );
}
