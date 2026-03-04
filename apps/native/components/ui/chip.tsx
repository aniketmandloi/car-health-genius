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
      bg: `${colors.success}1A`,
      text: colors.success,
      border: `${colors.success}4A`,
    },
    warning: {
      bg: `${colors.warning}1A`,
      text: colors.warning,
      border: `${colors.warning}4A`,
    },
    danger: {
      bg: `${colors.danger}1A`,
      text: colors.danger,
      border: `${colors.danger}4A`,
    },
    info: {
      bg: `${colors.info}1A`,
      text: colors.info,
      border: `${colors.info}4A`,
    },
    default: {
      bg: colors.input,
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
        paddingHorizontal: isSmall ? 8 : 10,
        paddingVertical: isSmall ? 3 : 5,
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
          textTransform: "capitalize",
        }}
      >
        {getTextContent(children)}
      </Text>
    </View>
  );
}

Chip.Label = ChipLabel;

export { Chip };
