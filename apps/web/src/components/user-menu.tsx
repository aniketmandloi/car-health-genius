import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

import { Button, buttonVariants } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const priorityQuery = useQuery({
    ...trpc.billing.getSupportPriority.queryOptions(),
    enabled: !!session,
  });
  const hasProSubscription = priorityQuery.data?.priorityTier === "priority";

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Button variant="outline" onClick={() => router.push("/login" as never)}>
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "outline" })}>
        <span className="flex items-center gap-1.5">
          {session.user.name}
          {hasProSubscription && (
            <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold leading-none text-primary">
              PRO
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          {hasProSubscription && (
            <DropdownMenuItem className="pointer-events-none text-xs font-semibold text-primary">
              Pro Priority Support Active
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/account" as never)}>
            Account Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/account/billing" as never)}
          >
            Subscription
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/support" as never)}>
            Support
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/");
                  },
                },
              });
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
