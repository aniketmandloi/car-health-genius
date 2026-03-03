"use client";

import { cn } from "@/lib/utils";

const GRADE_COLORS: Record<string, { stroke: string; text: string }> = {
  A: { stroke: "stroke-emerald-500", text: "text-emerald-500" },
  B: { stroke: "stroke-cyan-500", text: "text-cyan-500" },
  C: { stroke: "stroke-amber-500", text: "text-amber-500" },
  D: { stroke: "stroke-orange-500", text: "text-orange-500" },
  F: { stroke: "stroke-red-500", text: "text-red-500" },
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
        <defs>
          <linearGradient id={`ring-gradient-${grade}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(6 182 212)" />
            <stop offset="100%" stopColor="rgb(16 185 129)" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted/30"
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
