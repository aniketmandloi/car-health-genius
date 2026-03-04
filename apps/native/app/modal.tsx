import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppTheme } from "@/contexts/app-theme-context";

function Modal() {
  const { colors } = useAppTheme();

  function handleClose() {
    router.back();
  }

  return (
    <Container>
      <View className="flex-1 items-center justify-center p-5">
        <Card className="w-full max-w-sm rounded-3xl border border-surface-border p-6">
          <View className="items-center gap-2">
            <View
              style={{
                backgroundColor: colors.primarySoft,
                borderRadius: 16,
                padding: 14,
              }}
            >
              <Ionicons name="checkmark" size={24} color={colors.primary} />
            </View>

            <Text className="text-foreground text-xl font-bold">
              Action Completed
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 14,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Everything is synced and up to date. You can close this panel and
              continue where you left off.
            </Text>
          </View>
          <Button onPress={handleClose} className="mt-4" size="sm">
            Close
          </Button>
        </Card>
      </View>
    </Container>
  );
}

export default Modal;
