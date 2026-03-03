import { Link, Stack } from "expo-router";
import { Button, Card } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";

const SLATE_400 = "#94A3B8";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <Container>
        <View className="flex-1 justify-center items-center p-4">
          <Card
            variant="secondary"
            className="items-center p-6 max-w-sm rounded-2xl border border-surface-border"
          >
            <Text className="text-4xl mb-3">🤔</Text>
            <Text className="text-foreground font-medium text-lg mb-1">
              Page Not Found
            </Text>
            <Text
              style={{ color: SLATE_400, fontSize: 14, textAlign: "center" }}
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
