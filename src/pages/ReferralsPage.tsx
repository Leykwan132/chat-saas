import { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { Gift, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCredits(value: number) {
  return `${value.toLocaleString()} credits`;
}

function ReferralPageSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-8 pt-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex flex-col gap-8 rounded-4xl bg-muted/30 p-6 sm:p-8">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-80 max-w-full" />
          <Skeleton className="h-5 w-80 max-w-full" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full rounded-4xl" />
        </div>
      </div>
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

export default function ReferralsPage() {
  const { isLoading: isAuthLoading } = useAuth();
  const overview = useQuery(
    api.referrals.getMyOverview,
    isAuthLoading ? "skip" : {},
  );
  const {
    results: history,
    status: historyStatus,
    loadMore,
  } = usePaginatedQuery(
    api.referrals.listMyReferralHistory,
    isAuthLoading ? "skip" : {},
    { initialNumItems: 10 },
  );
  const [copied, setCopied] = useState(false);

  if (isAuthLoading || overview === undefined) {
    return <ReferralPageSkeleton />;
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(overview.code);
      setCopied(true);
      toast.success("Referral code copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the referral code");
    }
  };

  return (
    <div className="flex max-w-2xl animate-fade-in flex-col gap-8 pt-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Get Free Credits
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Give a friend {formatCredits(overview.rewardCredits)} and earn the
          same when they finish onboarding.
        </p>
      </div>

      <div className="flex flex-col gap-8 rounded-4xl bg-muted/30 p-6 sm:p-8">
        <section
          aria-labelledby="referral-how-it-works-title"
          className="flex flex-col gap-3"
        >
          <h2
            id="referral-how-it-works-title"
            className="font-heading text-sm font-medium"
          >
            How it works
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Share2 className="size-4 shrink-0 text-muted-foreground" />
              <p>Share your referral code.</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <UserPlus className="size-4 shrink-0 text-muted-foreground" />
              <p>They enter it while completing onboarding.</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Gift className="size-4 shrink-0 text-muted-foreground" />
              <p>
                You both get{" "}
                <span className="font-medium">
                  {formatCredits(overview.rewardCredits)}
                </span>
                .
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="your-referral-code-title"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="your-referral-code-title"
              className="font-heading text-sm font-medium"
            >
              Your referral code
            </h2>
            {overview.isCapped ? (
              <span className="text-xs text-muted-foreground">
                Referral limit reached
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <InputGroup className="h-10 flex-1 bg-background/80">
              <InputGroupInput
                aria-label="Your referral code"
                value={overview.code}
                readOnly
                className="font-mono font-medium tracking-wider"
              />
            </InputGroup>
            <Button
              type="button"
              className="h-10 sm:w-24"
              disabled={overview.isCapped}
              onClick={() => void copyCode()}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </section>
      </div>

      <section
        aria-labelledby="past-referrals-title"
        className="flex flex-col gap-5 pt-2"
      >
        <div className="flex flex-col gap-1.5">
          <h2
            id="past-referrals-title"
            className="font-heading text-base font-medium"
          >
            Past referrals
          </h2>
          <p className="text-sm text-muted-foreground">
            Completed referrals and the exact reward earned at the time.
          </p>
        </div>
        {historyStatus === "LoadingFirstPage" ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : history.length === 0 ? (
          <Empty className="min-h-32 bg-muted/30 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Gift />
              </EmptyMedia>
              <EmptyTitle>No referrals yet</EmptyTitle>
              <EmptyDescription>
                Completed referrals will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((referral) => (
                  <TableRow key={referral.redemptionId}>
                    <TableCell>{referral.maskedEmail}</TableCell>
                    <TableCell>
                      {new Date(referral.completedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      +{referral.rewardCredits.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {historyStatus === "CanLoadMore" ? (
              <Button
                type="button"
                variant="outline"
                className="self-center"
                onClick={() => loadMore(10)}
              >
                Load more
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
