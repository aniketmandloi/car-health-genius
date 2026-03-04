import React, { type PropsWithChildren } from "react";
import { Text, View } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";

type ChipColor = "success" | "warning" | "danger" | "default";

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
}: PropsWithChildren<{ color?: ChipColor; variant?: string; size?: string }>) {
  const { colors } = useAppTheme();

  const colorMap: Record<ChipColor, { bg: string; text: string }> = {
    success: { bg: `${colors.success}22`, text: colors.success },
    warning: { bg: `${colors.warning}22`, text: colors.warning },
    danger: { bg: `${colors.danger}22`, text: colors.danger },
    default: { bg: colors.input, text: colors.textMuted },
  };

  const { bg, text } = colorMap[color];

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: text, fontSize: 11, fontWeight: "600" }}>
        {getTextContent(children)}
      </Text>
    </View>
  );
}

Chip.Label = ChipLabel;

export { Chip };
