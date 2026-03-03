import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Button, Card } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";

const SLATE_400 = "#94A3B8";
const TEAL = "#06B6D4";

function Modal() {
  function handleClose() {
    router.back();
  }

  return (
    <Container>
      <View className="flex-1 justify-center items-center p-4">
        <Card
          variant="secondary"
          className="p-5 w-full max-w-sm rounded-2xl border border-white/10"
        >
          <View className="items-center">
            <View
              style={{
                backgroundColor: "rgba(6,182,212,0.12)",
                borderRadius: 12,
                padding: 12,
              }}
              className="mb-3"
            >
              <Ionicons name="checkmark" size={24} color={TEAL} />
            </View>
            <Text className="text-foreground font-medium text-lg mb-1">
              Modal Screen
            </Text>
            <Text
              style={{ color: SLATE_400, fontSize: 14, textAlign: "center" }}
              className="mb-4"
            >
              This is an example modal screen for dialogs and confirmations.
            </Text>
          </View>
          <Button onPress={handleClose} className="w-full" size="sm">
            <Button.Label>Close</Button.Label>
          </Button>
        </Card>
      </View>
    </Container>
  );
}

export default Modal;
