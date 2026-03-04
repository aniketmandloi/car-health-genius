import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightAction?: React.ReactNode;
};

export function SectionHeader({
  title,
  subtitle,
  icon,
  rightAction,
}: SectionHeaderProps) {
  const { colors } = useAppTheme();

  return (
    <View className="mb-2 flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center gap-2">
        {icon ? (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={14} color={colors.primary} />
          </View>
        ) : null}
        <View className="flex-1">
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightAction}
    </View>
  );
}
