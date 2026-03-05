import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import { Button } from "./button";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        alignItems: "center",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.panel,
        paddingHorizontal: 24,
        paddingVertical: 30,
      }}
    >
      <View
        style={{
          width: 70,
          height: 70,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primarySoft,
          borderWidth: 1,
          borderColor: `${colors.primary}66`,
        }}
      >
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text
        style={{
          color: colors.text,
          fontSize: 20,
          fontWeight: "700",
          marginTop: 15,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 13,
          lineHeight: 19,
          textAlign: "center",
          marginTop: 6,
        }}
      >
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Button size="sm" onPress={onAction} style={{ marginTop: 16 }}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
