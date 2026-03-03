import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0 w-fit",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border-primary/20",
        secondary: "bg-secondary/10 text-secondary border-secondary/20",
        destructive: "bg-destructive/10 text-destructive border-destructive/20",
        outline: "border-border text-foreground",
        ghost: "border-transparent text-muted-foreground",

        // Severity levels
        critical:
          "bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/15 dark:text-red-400",
        high: "bg-orange-500/10 text-orange-500 border-orange-500/20 dark:bg-orange-500/15 dark:text-orange-400",
        medium:
          "bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400",
        low: "bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400",
        cleared:
          "bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-400/15 dark:text-slate-400",

        // Triage
        safe: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400",
        service_soon:
          "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400",
        service_now:
          "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-400",

        // Priority
        soon: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-400",
        upcoming:
          "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400",
        later:
          "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400",

        // Issue status
        open: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400",
        in_progress:
          "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400",
        resolved:
          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400",
        closed:
          "bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-400/15 dark:text-slate-400",

        // Plan
        free: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-400/15 dark:text-slate-400",
        pro: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/15 dark:text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)]",

        // Health grade
        grade_a:
          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400",
        grade_b:
          "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/15 dark:text-cyan-400",
        grade_c:
          "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400",
        grade_d:
          "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/15 dark:text-orange-400",
        grade_f:
          "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-400",

        // Difficulty
        easy: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400",
        moderate:
          "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400",
        hard: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

function Badge({
  className,
  variant = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

/** Map severity string to badge variant */
function getSeverityVariant(
  severity: string | null | undefined,
): BadgeVariant {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "cleared":
      return "cleared";
    default:
      return "default";
  }
}

/** Map health grade letter to badge variant */
function getGradeVariant(grade: string | null | undefined): BadgeVariant {
  switch (grade?.toUpperCase()) {
    case "A":
      return "grade_a";
    case "B":
      return "grade_b";
    case "C":
      return "grade_c";
    case "D":
      return "grade_d";
    case "F":
      return "grade_f";
    default:
      return "default";
  }
}

/** Map triage class to badge variant */
function getTriageVariant(
  triage: string | null | undefined,
): BadgeVariant {
  switch (triage?.toLowerCase()) {
    case "safe":
      return "safe";
    case "service_soon":
      return "service_soon";
    case "service_now":
      return "service_now";
    default:
      return "default";
  }
}

/** Map priority string to badge variant */
function getPriorityVariant(
  priority: string | null | undefined,
): BadgeVariant {
  switch (priority?.toLowerCase()) {
    case "soon":
      return "soon";
    case "upcoming":
      return "upcoming";
    case "later":
      return "later";
    default:
      return "default";
  }
}

/** Map issue status to badge variant */
function getStatusVariant(
  status: string | null | undefined,
): BadgeVariant {
  switch (status?.toLowerCase()) {
    case "open":
      return "open";
    case "in_progress":
      return "in_progress";
    case "resolved":
      return "resolved";
    case "closed":
      return "closed";
    default:
      return "default";
  }
}

export {
  Badge,
  badgeVariants,
  getSeverityVariant,
  getGradeVariant,
  getTriageVariant,
  getPriorityVariant,
  getStatusVariant,
  type BadgeVariant,
};
