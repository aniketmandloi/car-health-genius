"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

function difficultyColor(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case "beginner":
    case "easy":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "intermediate":
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "advanced":
    case "hard":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

export function DiyGuideClient({
  diagnosticEventId,
}: {
  diagnosticEventId: number;
}) {
  const guideQuery = useQuery(
    trpc.recommendations.diyGuide.queryOptions({ diagnosticEventId }),
  );

  if (guideQuery.isLoading) {
    return (
      <div className="container mx-auto max-w-3xl space-y-4 p-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const guide = guideQuery.data?.guide;

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/results/${diagnosticEventId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Results
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">DIY Repair Guide</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step-by-step instructions for performing this repair yourself (Pro
          feature)
        </p>
      </div>

      {!guide ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">No DIY guide available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A DIY guide hasn&apos;t been published for this fault code yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{guide.title}</CardTitle>
              <CardDescription className="font-mono uppercase">
                {guide.dtcCode}
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyColor(guide.difficulty)}`}
                >
                  {guide.difficulty}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                  ~{guide.estimatedMinutes} min
                </span>
              </div>
            </CardHeader>
          </Card>

          {/* Safety Warnings */}
          {guide.safetyWarnings.length > 0 && (
            <Card className="border-orange-300 dark:border-orange-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-orange-700 dark:text-orange-400">
                  Safety Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {guide.safetyWarnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 shrink-0 text-orange-500">⚠</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Tools & Parts */}
          <div className="grid gap-4 sm:grid-cols-2">
            {guide.tools.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Tools Required</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {guide.tools.map((tool, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">🔧</span>
                        {tool}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {guide.parts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Parts Needed</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {guide.parts.map((part, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">📦</span>
                        {part}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Step-by-Step Instructions */}
          {guide.steps.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Step-by-Step Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {guide.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {idx + 1}
                      </span>
                      <p className="pt-0.5 text-sm leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground italic">
            This guide is for informational purposes only. If you are unsure
            about any step, consult a licensed mechanic. Improper repairs can
            cause vehicle damage or safety hazards.
          </p>
        </div>
      )}
    </div>
  );
}
