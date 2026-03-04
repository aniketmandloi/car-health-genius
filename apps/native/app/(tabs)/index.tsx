import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, TouchableOpacity, View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { Card } from "@/components/ui/card";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

export default function Home() {
  const { data: session } = authClient.useSession();
  const { colors } = useAppTheme();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();

  return (
    <Container className="p-6">
      <View className="mb-6 flex-row items-center gap-3 py-4">
        <View
          className="rounded-2xl p-1"
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.panel,
          }}
        >
          <Image
            source={require("../../assets/images/logo.png")}
            style={{ width: 48, height: 48, borderRadius: 12 }}
            resizeMode="cover"
          />
        </View>
        <View className="flex-1">
          <Text className="text-3xl font-bold text-foreground mb-1">
            Car <Text style={{ color: colors.primary }}>Health</Text> Genius
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>
            AI-powered vehicle diagnostics
          </Text>
        </View>
      </View>

      {session?.user ? (
        <>
          <Card className="mb-6 p-4 rounded-2xl border border-surface-border">
            <Text className="text-foreground text-base mb-2">
              Welcome,{" "}
              <Text className="font-semibold">{session.user.name}</Text>
            </Text>
            <Text
              style={{ color: colors.textMuted, fontSize: 13 }}
              className="mb-4"
            >
              {session.user.email}
            </Text>
            <Pressable
              style={{ backgroundColor: colors.danger }}
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
                <Card className="p-4 rounded-2xl border border-surface-border">
                  <View className="flex-row items-center gap-3">
                    <View
                      style={{
                        backgroundColor: colors.primarySoft,
                        borderRadius: 12,
                        padding: 10,
                      }}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground font-semibold text-sm">
                        {item.label}
                      </Text>
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {item.desc}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textMuted}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <Card className="mt-6 p-4 rounded-2xl border border-surface-border">
          <Text className="text-foreground text-xl font-bold">Get Started</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
            Create an account or sign in to save scans and track issues.
          </Text>

          <View
            className="mt-4 flex-row rounded-xl p-1"
            style={{
              backgroundColor: colors.input,
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            <TouchableOpacity
              onPress={() => setAuthMode("signin")}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingVertical: 9,
                alignItems: "center",
                backgroundColor:
                  authMode === "signin" ? colors.primary : "transparent",
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  color:
                    authMode === "signin"
                      ? colors.textOnPrimary
                      : colors.textMuted,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthMode("signup")}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingVertical: 9,
                alignItems: "center",
                backgroundColor:
                  authMode === "signup" ? colors.primary : "transparent",
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  color:
                    authMode === "signup"
                      ? colors.textOnPrimary
                      : colors.textMuted,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mt-4">
            {authMode === "signin" ? <SignIn /> : <SignUp />}
          </View>
        </Card>
      )}
    </Container>
  );
}
