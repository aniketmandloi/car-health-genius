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
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: colors.primarySoft,
              borderWidth: 1,
              borderColor: `${colors.primary}30`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={14} color={colors.primary} />
          </View>
        ) : null}
        <View className="flex-1">
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
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
