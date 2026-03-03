import { Ionicons } from "@expo/vector-icons";
import { Button, Card } from "heroui-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

const TEAL = "#06B6D4";
const RED = "#EF4444";
const SLATE_400 = "#94A3B8";

export default function Home() {
  const { data: session } = authClient.useSession();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();

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
        <>
          <Card
            variant="secondary"
            className="mb-6 p-4 rounded-2xl border border-white/10"
          >
            <Text className="text-foreground text-base mb-2">
              Welcome,{" "}
              <Text className="font-semibold">{session.user.name}</Text>
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

          <View className="mt-6 gap-3">
            {[
              {
                icon: "scan-outline",
                label: "Scan Vehicle",
                desc: "Connect your OBD adapter and read codes",
                route: "/(tabs)/scan",
              },
              {
                icon: "car-sport-outline",
                label: "My Vehicles",
                desc: "Manage your vehicle profiles",
                route: "/(tabs)/vehicles",
              },
              {
                icon: "time-outline",
                label: "View History",
                desc: "Browse past diagnostics and results",
                route: "/(tabs)/history",
              },
            ].map((item) => (
              <TouchableOpacity
                key={item.route}
                onPress={() => router.push(item.route as never)}
                activeOpacity={0.7}
              >
                <Card
                  variant="secondary"
                  className="p-4 rounded-2xl border border-white/10"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      style={{
                        backgroundColor: "rgba(6,182,212,0.12)",
                        borderRadius: 12,
                        padding: 10,
                      }}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={TEAL}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground font-semibold text-sm">
                        {item.label}
                      </Text>
                      <Text
                        style={{ color: SLATE_400, fontSize: 12, marginTop: 2 }}
                      >
                        {item.desc}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={SLATE_400}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </>
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
