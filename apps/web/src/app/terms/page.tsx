import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TermsPage() {
  return (
    <div className="cb-page-compact space-y-6 pb-10">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Legal
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">
          Car Health Genius provides educational diagnostics guidance, not
          professional mechanical or legal advice.
        </p>
      </div>

      <div className="cb-section space-y-5 p-6 text-sm text-muted-foreground">
        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">Service Scope</h2>
          <p>
            The platform offers AI-assisted analysis and maintenance support
            content for informational use.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">User Responsibilities</h2>
          <p>
            You are responsible for final repair decisions and should consult a
            licensed mechanic for confirmed diagnosis and safety-sensitive work.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">Billing</h2>
          <p>
            Paid subscriptions renew per selected plan cadence unless canceled
            based on your account billing terms.
          </p>
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={"/" as never} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to Home
        </Link>
        <Link href={"/support" as never}>
          <Button size="sm">Contact Support</Button>
        </Link>
      </div>
    </div>
  );
}

