import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useAppTheme } from "@/contexts/app-theme-context";

type ProgressRingProps = {
  score: number;
  grade: string;
  size?: number;
  strokeWidth?: number;
};

function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "#119D66";
    case "B":
      return "#2D66F6";
    case "C":
      return "#D18A22";
    case "D":
      return "#D36D2C";
    default:
      return "#D2445D";
  }
}

export function ProgressRing({
  score,
  grade,
  size = 64,
  strokeWidth = 6,
}: ProgressRingProps) {
  const { colors } = useAppTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference * (1 - progress / 100);
  const color = gradeColor(grade);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.track}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text
        style={{
          color,
          fontSize: Math.max(16, size * 0.32),
          fontWeight: "800",
          lineHeight: Math.max(18, size * 0.35),
        }}
      >
        {grade}
      </Text>
    </View>
  );
}
