import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary",
        secondary: "border-border/60 bg-secondary text-secondary-foreground",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "border-border/80 bg-card text-foreground",
        ghost: "border-border/50 bg-muted/45 text-muted-foreground",

        critical:
          "border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-300",
        high: "border-orange-500/30 bg-orange-500/12 text-orange-700 dark:text-orange-300",
        medium:
          "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300",
        low: "border-blue-500/30 bg-blue-500/12 text-blue-700 dark:text-blue-300",
        cleared:
          "border-slate-500/30 bg-slate-500/12 text-slate-600 dark:text-slate-300",

        safe: "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        service_soon:
          "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300",
        service_now:
          "border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-300",

        soon: "border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-300",
        upcoming:
          "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300",
        later:
          "border-blue-500/30 bg-blue-500/12 text-blue-700 dark:text-blue-300",

        open: "border-blue-500/30 bg-blue-500/12 text-blue-700 dark:text-blue-300",
        in_progress:
          "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300",
        resolved:
          "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        closed:
          "border-slate-500/30 bg-slate-500/12 text-slate-600 dark:text-slate-300",

        free: "border-slate-500/30 bg-slate-500/12 text-slate-600 dark:text-slate-300",
        pro: "border-primary/30 bg-primary/12 text-primary shadow-[0_8px_20px_-14px_rgba(0,82,255,0.6)]",

        grade_a:
          "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        grade_b:
          "border-blue-500/30 bg-blue-500/12 text-blue-700 dark:text-blue-300",
        grade_c:
          "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300",
        grade_d:
          "border-orange-500/30 bg-orange-500/12 text-orange-700 dark:text-orange-300",
        grade_f:
          "border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-300",

        easy: "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        moderate:
          "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300",
        hard: "border-red-500/30 bg-red-500/12 text-red-700 dark:text-red-300",
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
