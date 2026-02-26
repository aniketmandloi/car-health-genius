import { Ionicons } from "@expo/vector-icons";
import { getNativeFeatureFlags } from "@car-health-genius/env/native-flags";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Chip, useThemeColor } from "heroui-native";
import { useState } from "react";
import { Text, View, Pressable } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

export default function Home() {
  const featureFlags = getNativeFeatureFlags();
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const isConnected = healthCheck?.data === "OK";
  const isLoading = healthCheck?.isLoading;
  const { data: session } = authClient.useSession();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const privateData = useQuery({
    ...trpc.privateData.queryOptions(),
    enabled: !!session?.user,
  });

  const mutedColor = useThemeColor("muted");
  const successColor = useThemeColor("success");
  const dangerColor = useThemeColor("danger");
  const foregroundColor = useThemeColor("foreground");

  return (
    <Container className="p-6">
      <View className="py-4 mb-6">
        <Text className="text-4xl font-bold text-foreground mb-2">BETTER T STACK</Text>
      </View>

      {session?.user ? (
        <Card variant="secondary" className="mb-6 p-4">
          <Text className="text-foreground text-base mb-2">
            Welcome, <Text className="font-medium">{session.user.name}</Text>
          </Text>
          <Text className="text-muted text-sm mb-4">{session.user.email}</Text>
          <Pressable
            className="bg-danger py-3 px-4 rounded-lg self-start active:opacity-70"
            onPress={() => {
              authClient.signOut();
              queryClient.invalidateQueries();
            }}
          >
            <Text className="text-foreground font-medium">Sign Out</Text>
          </Pressable>
        </Card>
      ) : null}

      <Card variant="secondary" className="p-6">
        <View className="flex-row items-center justify-between mb-4">
          <Card.Title>System Status</Card.Title>
          <Chip variant="secondary" color={isConnected ? "success" : "danger"} size="sm">
            <Chip.Label>{isConnected ? "LIVE" : "OFFLINE"}</Chip.Label>
          </Chip>
        </View>

        <Card className="p-4">
          <View className="flex-row items-center">
            <View
              className={`w-3 h-3 rounded-full mr-3 ${isConnected ? "bg-success" : "bg-muted"}`}
            />
            <View className="flex-1">
              <Text className="text-foreground font-medium mb-1">TRPC Backend</Text>
              <Card.Description>
                {isLoading
                  ? "Checking connection..."
                  : isConnected
                    ? "Connected to API"
                    : "API Disconnected"}
              </Card.Description>
            </View>
            {isLoading && <Ionicons name="hourglass-outline" size={20} color={mutedColor} />}
            {!isLoading && isConnected && (
              <Ionicons name="checkmark-circle" size={20} color={successColor} />
            )}
            {!isLoading && !isConnected && (
              <Ionicons name="close-circle" size={20} color={dangerColor} />
            )}
          </View>
        </Card>

        <Card.Description className="mt-3">
          Flags: free-tier {featureFlags.freeTierEnabled ? "on" : "off"}, pro-paywall{" "}
          {featureFlags.proPaywallEnabled ? "on" : "off"}
        </Card.Description>
      </Card>

      {session?.user ? (
        <Card variant="secondary" className="mt-6 p-4">
          <Card.Title className="mb-3">Private Data</Card.Title>
          <Card.Description>{privateData.data?.message ?? "No private payload"}</Card.Description>
        </Card>
      ) : (
        <Card variant="secondary" className="mt-6 p-4">
          <Card.Title className="mb-3">Get Started</Card.Title>
          <View className="flex-row gap-2 mb-3">
            <Button
              variant={authMode === "signin" ? "primary" : "secondary"}
              className="flex-1"
              onPress={() => setAuthMode("signin")}
            >
              Sign In
            </Button>
            <Button
              variant={authMode === "signup" ? "primary" : "secondary"}
              className="flex-1"
              onPress={() => setAuthMode("signup")}
            >
              Create Account
            </Button>
          </View>
          {authMode === "signin" ? <SignIn /> : <SignUp />}
        </Card>
      )}
    </Container>
  );
}
