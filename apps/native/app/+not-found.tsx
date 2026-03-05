import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function NotFoundScreen() {
  const { colors } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <Container>
        <View className="flex-1 justify-center items-center p-4">
          <Card variant="elevated" className="items-center max-w-sm rounded-2xl">
            <View
              style={{
                backgroundColor: colors.primarySoft,
                borderRadius: 999,
                width: 56,
                height: 56,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons
                name="help-circle-outline"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text
              style={{
                color: colors.text,
                fontWeight: "600",
                fontSize: 18,
                marginBottom: 4,
              }}
            >
              Page Not Found
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 14,
                textAlign: "center",
              }}
              className="mb-4"
            >
              The page you're looking for doesn't exist.
            </Text>
            <Link href="/" asChild>
              <Button size="sm">Go Home</Button>
            </Link>
          </Card>
        </View>
      </Container>
    </>
  );
}
