import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Pressable } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";
import { useThemeColor } from "heroui-native";

import { useAppTheme } from "@/contexts/app-theme-context";

export function ThemeToggle() {
  const { toggleTheme, isLight } = useAppTheme();
  const iconColor = useThemeColor("foreground");

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        toggleTheme();
      }}
      className="px-2.5"
    >
      {isLight ? (
        <Animated.View key="moon" entering={ZoomIn} exiting={FadeOut}>
          <Ionicons name="moon" size={20} color={iconColor} />
        </Animated.View>
      ) : (
        <Animated.View key="sun" entering={ZoomIn} exiting={FadeOut}>
          <Ionicons name="sunny" size={20} color={iconColor} />
        </Animated.View>
      )}
    </Pressable>
  );
}
