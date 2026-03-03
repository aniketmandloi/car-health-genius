import { Ionicons } from "@expo/vector-icons";
import { getNativeFeatureFlags } from "@car-health-genius/env/native-flags";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Chip } from "heroui-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

const TEAL = "#06B6D4";
const EMERALD = "#10B981";
const RED = "#EF4444";
const SLATE_400 = "#94A3B8";

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

  return (
    <Container className="p-6">
      <View className="py-4 mb-6">
        <Text className="text-4xl font-bold text-foreground mb-1">
          Car <Text style={{ color: TEAL }}>Health</Text> Genius
        </Text>
        <Text style={{ color: SLATE_400, fontSize: 14 }}>
          AI-powered vehicle diagnostics
        </Text>
      </View>

      {session?.user ? (
        <Card
          variant="secondary"
          className="mb-6 p-4 rounded-2xl border border-white/10"
        >
          <Text className="text-foreground text-base mb-2">
            Welcome, <Text className="font-semibold">{session.user.name}</Text>
          </Text>
          <Text style={{ color: SLATE_400, fontSize: 13 }} className="mb-4">
            {session.user.email}
          </Text>
          <Pressable
            style={{ backgroundColor: RED }}
            className="py-3 px-4 rounded-xl self-start active:opacity-70"
            onPress={() => {
              authClient.signOut();
              queryClient.invalidateQueries();
            }}
          >
            <Text className="text-white font-medium">Sign Out</Text>
          </Pressable>
        </Card>
      ) : null}

      <Card
        variant="secondary"
        className="p-6 rounded-2xl border border-white/10"
      >
        <View className="flex-row items-center justify-between mb-4">
          <Card.Title>System Status</Card.Title>
          <Chip
            variant="secondary"
            color={isConnected ? "success" : "danger"}
            size="sm"
          >
            <Chip.Label>{isConnected ? "LIVE" : "OFFLINE"}</Chip.Label>
          </Chip>
        </View>

        <Card className="p-4 rounded-xl">
          <View className="flex-row items-center">
            <View
              style={{ backgroundColor: isConnected ? EMERALD : SLATE_400 }}
              className="w-3 h-3 rounded-full mr-3"
            />
            <View className="flex-1">
              <Text className="text-foreground font-medium mb-1">
                tRPC Backend
              </Text>
              <Card.Description>
                {isLoading
                  ? "Checking connection..."
                  : isConnected
                    ? "Connected to API"
                    : "API Disconnected"}
              </Card.Description>
            </View>
            {isLoading && (
              <Ionicons name="hourglass-outline" size={20} color={SLATE_400} />
            )}
            {!isLoading && isConnected && (
              <Ionicons name="checkmark-circle" size={20} color={EMERALD} />
            )}
            {!isLoading && !isConnected && (
              <Ionicons name="close-circle" size={20} color={RED} />
            )}
          </View>
        </Card>

        <Text style={{ color: SLATE_400, fontSize: 11, marginTop: 12 }}>
          Flags: free-tier {featureFlags.freeTierEnabled ? "on" : "off"},
          pro-paywall {featureFlags.proPaywallEnabled ? "on" : "off"}
        </Text>
      </Card>

      {session?.user ? (
        <Card
          variant="secondary"
          className="mt-6 p-4 rounded-2xl border border-white/10"
        >
          <Card.Title className="mb-3">Private Data</Card.Title>
          <Card.Description>
            {privateData.data?.message ?? "No private payload"}
          </Card.Description>
        </Card>
      ) : (
        <Card
          variant="secondary"
          className="mt-6 p-4 rounded-2xl border border-white/10"
        >
          <Card.Title className="mb-3">Get Started</Card.Title>
          <View className="flex-row gap-2 mb-3">
            <Button
              variant={authMode === "signin" ? "primary" : "secondary"}
              className="flex-1"
              style={
                authMode === "signin"
                  ? {
                      shadowColor: "#06B6D4",
                      shadowOpacity: 0.3,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 6,
                    }
                  : undefined
              }
              onPress={() => setAuthMode("signin")}
            >
              Sign In
            </Button>
            <Button
              variant={authMode === "signup" ? "primary" : "secondary"}
              className="flex-1"
              style={
                authMode === "signup"
                  ? {
                      shadowColor: "#06B6D4",
                      shadowOpacity: 0.3,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 6,
                    }
                  : undefined
              }
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
