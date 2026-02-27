import { env } from "@car-health-genius/env/native";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Spinner } from "heroui-native";
import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";

import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

type Plan = "monthly" | "annual";

type CheckoutResponse = {
  url?: string;
  redirect?: boolean;
};

async function createCheckoutUrl(args: {
  slug: "pro-monthly" | "pro-annual";
  successUrl: string;
}) {
  const cookies = authClient.getCookie();

  const response = await fetch(`${env.EXPO_PUBLIC_SERVER_URL}/api/auth/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: JSON.stringify({
      slug: args.slug,
      successUrl: args.successUrl,
      returnUrl: "car-health-genius://",
      redirect: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Checkout failed with status ${response.status}`);
  }

  const payload = (await response.json()) as CheckoutResponse;
  if (!payload.url) {
    throw new Error("Checkout URL was not returned");
  }

  return payload.url;
}

export default function PricingTab() {
  const { data: session } = authClient.useSession();
  const [status, setStatus] = useState<string>("Choose a plan to unlock Pro diagnostics.");

  const trackPaywallView = useMutation(
    trpc.billing.trackPaywallView.mutationOptions({
      onError: () => {
        // Non-blocking analytics.
      },
    }),
  );

  const createCheckoutSession = useMutation(trpc.billing.createCheckoutSession.mutationOptions());

  useEffect(() => {
    if (!session?.user || trackPaywallView.isSuccess || trackPaywallView.isPending) {
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

      const url = await createCheckoutUrl({
        slug: intent.checkoutSlug,
        successUrl: intent.successUrl,
      });

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        throw new Error("Cannot open checkout URL on this device");
      }

      await Linking.openURL(url);
      setStatus("Checkout opened in browser.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to start checkout");
    }
  }

  return (
    <Container className="p-6">
      <View className="gap-4">
        <Card variant="secondary" className="p-5">
          <Card.Title>Pro Upgrade</Card.Title>
          <Card.Description>
            Unlock likely causes, advanced diagnostics, and maintenance intelligence.
          </Card.Description>

          <View className="mt-4 gap-3">
            <Card className="p-4">
              <Text className="text-foreground text-lg font-semibold">Monthly Pro - $9.99/mo</Text>
              <Text className="mt-1 text-muted text-sm">Best for testing full feature depth before annual commitment.</Text>
              <Button className="mt-3" onPress={() => startCheckout("monthly")} isDisabled={createCheckoutSession.isPending}>
                Choose Monthly
              </Button>
            </Card>

            <Card className="p-4">
              <Text className="text-foreground text-lg font-semibold">Annual Pro - $79/yr</Text>
              <Text className="mt-1 text-muted text-sm">Lower annual effective cost with full Pro diagnostics unlocked.</Text>
              <Button className="mt-3" onPress={() => startCheckout("annual")} isDisabled={createCheckoutSession.isPending}>
                Choose Annual
              </Button>
            </Card>
          </View>

          {createCheckoutSession.isPending ? (
            <View className="mt-4 flex-row items-center gap-2">
              <Spinner size="sm" />
              <Text className="text-muted text-sm">Starting checkout...</Text>
            </View>
          ) : null}

          <Text className="mt-4 text-sm text-muted">{status}</Text>
          {!session?.user ? (
            <Text className="mt-1 text-xs text-muted">Sign in from Home tab before starting checkout.</Text>
          ) : null}
        </Card>
      </View>
    </Container>
  );
}
