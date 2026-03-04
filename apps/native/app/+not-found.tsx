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
          <Card className="items-center p-6 max-w-sm rounded-2xl border border-surface-border">
            <Text className="text-4xl mb-3">🤔</Text>
            <Text className="text-foreground font-medium text-lg mb-1">
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
