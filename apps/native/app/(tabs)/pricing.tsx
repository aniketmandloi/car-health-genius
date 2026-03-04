import { env } from "@car-health-genius/env/native";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

type Plan = "monthly" | "annual";

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
    <Container className="p-6">
      <View className="gap-4">
        {/* Header */}
        <View className="mb-2">
          <Text className="text-foreground text-2xl font-bold">
            Upgrade to <Text style={{ color: colors.primary }}>Pro</Text>
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4 }}>
            Unlock likely causes, advanced diagnostics, and maintenance
            intelligence.
          </Text>
        </View>

        {/* Monthly Plan */}
        <Card
          className="p-5 rounded-2xl"
          style={{ borderWidth: 1, borderColor: `${colors.primary}40` }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-foreground text-lg font-bold">
              Monthly Pro
            </Text>
            <View
              style={{ backgroundColor: colors.primarySoft }}
              className="rounded-full px-2.5 py-0.5"
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                Monthly
              </Text>
            </View>
          </View>
          <View className="flex-row items-end gap-1 mb-1">
            <Text className="text-foreground text-3xl font-bold">$9.99</Text>
            <Text
              style={{ color: colors.textMuted, fontSize: 14, marginBottom: 4 }}
            >
              / month
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Full diagnostic intelligence. Cancel anytime.
          </Text>
          <Button
            className="mt-4"
            style={{
              shadowColor: colors.primary,
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 0 },
              elevation: 6,
            }}
            onPress={() => startCheckout("monthly")}
            isDisabled={createCheckoutSession.isPending}
          >
            Choose Monthly
          </Button>
        </Card>

        {/* Annual Plan */}
        <Card
          className="p-5 rounded-2xl"
          style={{ borderWidth: 1, borderColor: `${colors.secondary}40` }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-foreground text-lg font-bold">
              Annual Pro
            </Text>
            <View
              style={{ backgroundColor: `${colors.secondary}26` }}
              className="rounded-full px-2.5 py-0.5"
            >
              <Text
                style={{
                  color: colors.secondary,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                Best Value
              </Text>
            </View>
          </View>
          <View className="flex-row items-end gap-1 mb-1">
            <Text className="text-foreground text-3xl font-bold">$79</Text>
            <Text
              style={{ color: colors.textMuted, fontSize: 14, marginBottom: 4 }}
            >
              / year
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Save 34% vs monthly. Priority access to new features.
          </Text>
          <Button
            className="mt-4"
            style={{
              shadowColor: colors.primary,
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 0 },
              elevation: 6,
            }}
            onPress={() => startCheckout("annual")}
            isDisabled={createCheckoutSession.isPending}
          >
            Choose Annual
          </Button>
        </Card>

        {/* Status */}
        {createCheckoutSession.isPending ? (
          <View className="flex-row items-center gap-2 mt-2">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              Starting checkout...
            </Text>
          </View>
        ) : null}

        <View className="rounded-2xl border border-surface-border p-4 mt-2">
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
        </View>
      </View>
    </Container>
  );
}
