import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

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
    <Container variant="plain">
      <View className="flex-1 items-center justify-center p-5">
        <Animated.View entering={ZoomIn.duration(300).springify()}>
          <Card variant="elevated" className="w-full max-w-sm rounded-3xl">
            <View className="items-center gap-3">
              <View
                style={{
                  backgroundColor: colors.primarySoft,
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <Ionicons name="checkmark" size={24} color={colors.primary} />
              </View>

              <Text
                style={{
                  color: colors.text,
                  fontSize: 20,
                  fontWeight: "700",
                }}
              >
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
                Everything is synced and up to date. You can close this panel
                and continue where you left off.
              </Text>
            </View>
            <Button
              onPress={handleClose}
              size="sm"
              style={{ marginTop: 16 }}
            >
              Close
            </Button>
          </Card>
        </Animated.View>
      </View>
    </Container>
  );
}

export default Modal;
