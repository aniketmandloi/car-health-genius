import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PrivacyPage() {
  return (
    <div className="cb-page-compact space-y-6 pb-10">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Legal
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          We collect only the data required to provide diagnostics, account
          access, billing, and support workflows.
        </p>
      </div>

      <div className="cb-section space-y-5 p-6 text-sm text-muted-foreground">
        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">What We Collect</h2>
          <p>
            Vehicle profile details, diagnostic events, account identity data,
            and billing metadata needed to deliver core product functionality.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">How We Use It</h2>
          <p>
            Data is used to generate insights, maintain account security, process
            subscriptions, and assist with support tickets.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">Your Control</h2>
          <p>
            You can export and delete your data anytime from Account Settings.
          </p>
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={"/" as never} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to Home
        </Link>
        <Link href={"/account" as never}>
          <Button size="sm">Manage Data</Button>
        </Link>
      </div>
    </div>
  );
}

