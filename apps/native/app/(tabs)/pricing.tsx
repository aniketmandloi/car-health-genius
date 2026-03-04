import { Ionicons } from "@expo/vector-icons";
import { env } from "@car-health-genius/env/native";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useAppTheme } from "@/contexts/app-theme-context";
import { TYPO } from "@/lib/design";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

type Plan = "monthly" | "annual";

const FEATURES = [
  "AI-powered diagnostics",
  "Likely causes with confidence",
  "Step-by-step DIY guides",
  "Cost estimates & negotiation",
  "Priority support",
];

export default function PricingTab() {
  const { colors } = useAppTheme();
  const { data: session } = authClient.useSession();
  const [status, setStatus] = useState<string>(
    "Choose a plan to unlock Pro diagnostics.",
  );

  const trackPaywallView = useMutation(
    trpc.billing.trackPaywallView.mutationOptions({
      onError: () => {},
    }),
  );

  const createCheckoutSession = useMutation(
    trpc.billing.createCheckoutSession.mutationOptions(),
  );

  useEffect(() => {
    if (
      !session?.user ||
      trackPaywallView.isSuccess ||
      trackPaywallView.isPending
    ) {
      return;
    }

    trackPaywallView.mutate({
      channel: "native",
      source: "native_pricing_tab",
    });
  }, [session?.user, trackPaywallView]);

  async function startCheckout(plan: Plan) {
    if (!session?.user) {
      setStatus("Sign in first to upgrade.");
      return;
    }

    setStatus("Preparing checkout...");

    try {
      const intent = await createCheckoutSession.mutateAsync({
        plan,
        successUrl: `${env.EXPO_PUBLIC_SERVER_URL}/success?plan=${plan}`,
      });

      const url = intent.checkoutUrl;
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        throw new Error("Cannot open checkout URL on this device");
      }

      await Linking.openURL(url);
      setStatus("Checkout opened in browser.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to start checkout",
      );
    }
  }

  return (
    <Container className="px-4 pb-8 pt-2">
      <View className="gap-5">
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <Text style={{ ...TYPO.h1, color: colors.text }}>
            Go <Text style={{ color: colors.primary }}>Pro</Text>
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 14,
              marginTop: 6,
              lineHeight: 20,
            }}
          >
            Unlock advanced diagnostics, richer reports, and faster support.
          </Text>
        </Animated.View>

        {/* Feature Checklist */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Card variant="default">
            {FEATURES.map((feat, i) => (
              <View
                key={feat}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 6,
                  borderBottomWidth: i < FEATURES.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                  }}
                >
                  {feat}
                </Text>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Annual Plan — promoted */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Card variant="accent">
            <View className="flex-row items-center justify-between mb-2">
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                Annual Pro
              </Text>
              <Chip color="success" dot>
                MOST POPULAR
              </Chip>
            </View>
            <View className="flex-row items-end gap-1 mb-1">
              <Text
                style={{
                  color: colors.text,
                  fontSize: 32,
                  fontWeight: "800",
                }}
              >
                $79
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                / year
              </Text>
            </View>
            <Text style={{ color: colors.success, fontSize: 13, fontWeight: "600" }}>
              Save 34% vs monthly pricing
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 13,
                marginTop: 2,
              }}
            >
              Priority access to new features.
            </Text>
            <Button
              style={{ marginTop: 14 }}
              onPress={() => startCheckout("annual")}
              isDisabled={createCheckoutSession.isPending}
              isLoading={createCheckoutSession.isPending}
            >
              Start Annual
            </Button>
          </Card>
        </Animated.View>

        {/* Monthly Plan — subdued */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Card variant="outlined">
            <View className="flex-row items-center justify-between mb-2">
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Monthly Pro
              </Text>
            </View>
            <View className="flex-row items-end gap-1 mb-1">
              <Text
                style={{
                  color: colors.text,
                  fontSize: 26,
                  fontWeight: "700",
                }}
              >
                $9.99
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 14,
                  marginBottom: 4,
                }}
              >
                / month
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              Full diagnostic intelligence. Cancel anytime.
            </Text>
            <Button
              variant="outline"
              style={{ marginTop: 14 }}
              onPress={() => startCheckout("monthly")}
              isDisabled={createCheckoutSession.isPending}
            >
              Start Monthly
            </Button>
          </Card>
        </Animated.View>

        {/* Status */}
        {createCheckoutSession.isPending ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              Starting checkout...
            </Text>
          </View>
        ) : null}

        <Card variant="recessed">
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {status}
          </Text>
          {!session?.user ? (
            <Text
              style={{ color: colors.textSubtle, fontSize: 12, marginTop: 4 }}
            >
              Sign in from Home tab before starting checkout.
            </Text>
          ) : null}
        </Card>
      </View>
    </Container>
  );
}
