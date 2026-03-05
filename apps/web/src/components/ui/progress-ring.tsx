"use client";

import { cn } from "@/lib/utils";

const GRADE_COLORS: Record<string, { stroke: string; text: string }> = {
  A: { stroke: "stroke-emerald-500", text: "text-emerald-600 dark:text-emerald-300" },
  B: { stroke: "stroke-blue-500", text: "text-blue-600 dark:text-blue-300" },
  C: { stroke: "stroke-amber-500", text: "text-amber-600 dark:text-amber-300" },
  D: { stroke: "stroke-orange-500", text: "text-orange-600 dark:text-orange-300" },
  F: { stroke: "stroke-red-500", text: "text-red-600 dark:text-red-300" },
};

interface ProgressRingProps {
  score: number; // 0-100
  grade: string; // A, B, C, D, F
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({
  score,
  grade,
  size = 80,
  strokeWidth = 6,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const colors = GRADE_COLORS[grade.toUpperCase()] ?? GRADE_COLORS.C;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted/55"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000 ease-out", colors.stroke)}
        />
      </svg>
      {/* Grade letter */}
      <span
        className={cn(
          "absolute text-lg font-bold",
          colors.text,
        )}
      >
        {grade.toUpperCase()}
      </span>
    </div>
  );
}
