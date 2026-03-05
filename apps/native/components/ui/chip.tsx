import React, { type PropsWithChildren } from "react";
import { Text, View } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";

type ChipColor = "success" | "warning" | "danger" | "default" | "info";
type ChipSize = "sm" | "md";

function ChipLabel({ children }: PropsWithChildren) {
  return <>{children}</>;
}

function getTextContent(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string" || typeof node === "number") return node;
  if (React.isValidElement(node)) {
    return getTextContent(
      (node.props as { children?: React.ReactNode }).children,
    );
  }
  return null;
}

function Chip({
  children,
  color = "default",
  size = "md",
  dot,
}: PropsWithChildren<{
  color?: ChipColor;
  variant?: string;
  size?: ChipSize;
  dot?: boolean;
}>) {
  const { colors } = useAppTheme();

  const colorMap: Record<ChipColor, { bg: string; text: string; border: string }> = {
    success: {
      bg: `${colors.success}14`,
      text: colors.success,
      border: `${colors.success}3C`,
    },
    warning: {
      bg: `${colors.warning}14`,
      text: colors.warning,
      border: `${colors.warning}3C`,
    },
    danger: {
      bg: `${colors.danger}14`,
      text: colors.danger,
      border: `${colors.danger}3C`,
    },
    info: {
      bg: `${colors.info}14`,
      text: colors.info,
      border: `${colors.info}3C`,
    },
    default: {
      bg: colors.surfaceRecessed,
      text: colors.textMuted,
      border: colors.border,
    },
  };

  const { bg, text, border } = colorMap[color];
  const isSmall = size === "sm";

  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: isSmall ? 9 : 11,
        paddingVertical: isSmall ? 4 : 6,
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
      }}
    >
      {dot ? (
        <View
          style={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: 999,
            backgroundColor: text,
          }}
        />
      ) : null}
      <Text
        style={{
          color: text,
          fontSize: isSmall ? 11 : 12,
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {getTextContent(children)}
      </Text>
    </View>
  );
}

Chip.Label = ChipLabel;

export { Chip };
