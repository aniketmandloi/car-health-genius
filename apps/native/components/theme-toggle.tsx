import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, View } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";

import { useAppTheme } from "@/contexts/app-theme-context";

export function ThemeToggle() {
  const { toggleTheme, isLight, colors } = useAppTheme();

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === "ios" || Platform.OS === "android") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        toggleTheme();
      }}
      hitSlop={8}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.input,
        }}
      >
        {isLight ? (
          <Animated.View key="moon" entering={ZoomIn.duration(220)} exiting={FadeOut.duration(140)}>
            <Ionicons name="moon" size={17} color={colors.textMuted} />
          </Animated.View>
        ) : (
          <Animated.View key="sun" entering={ZoomIn.duration(220)} exiting={FadeOut.duration(140)}>
            <Ionicons name="sunny" size={17} color={colors.warning} />
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
}
