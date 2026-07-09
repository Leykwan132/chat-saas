import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { SiWhatsapp } from 'react-icons/si';
import { Plus, Check, ChevronRight, X, Equal, Loader2, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import {
  BroadcastOverviewDialog,
  OVERVIEW_VARIANT_META,
} from '@/components/WhatsAppFeatureOverviewDialog';
import {
  BAN_GUIDE_META,
  WhatsAppBanGuideDialog,
} from '@/components/WhatsAppBanGuideDialog';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WhatsAppFeatureGate } from '@/components/WhatsAppFeatureGate';



interface BookCardProps {
  tag: string;
  title: React.ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  isDark?: boolean;
}

function BookCard({ tag, title, onClick, to, disabled, isDark }: BookCardProps) {
  const cardContent = (
    <>
      {/* Book Body (Inside Pages/Back) - Single container instead of a growing-smaller stack */}
      <div className="absolute inset-0 rounded-r-[14px] rounded-l-sm bg-white dark:bg-[#1a1a1a] border border-neutral-200/80 dark:border-neutral-800/80 shadow-inner z-0 transition-transform duration-500 ease-out group-hover:translate-x-1.5" />

      {/* Front Cover */}
      <div 
        style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
        className={`absolute inset-0 rounded-r-[14px] rounded-l-sm border pl-[25px] pr-3.5 py-3.5 flex flex-col justify-between transition-transform duration-500 ease-out group-hover:[transform:rotateY(-24deg)] z-20 shadow-md group-hover:shadow-lg origin-left ${
          isDark 
            ? 'bg-neutral-950 dark:bg-black border-neutral-900 text-white' 
            : 'bg-[#fafafa] dark:bg-[#202020] border-neutral-200/80 dark:border-neutral-800/80 text-neutral-800 dark:text-neutral-100'
        }`}
      >
        <div className="flex flex-col gap-2">
          {/* App Logo */}
          <img 
            src="/icon.svg" 
            className={`size-5 shrink-0 ${isDark ? 'invert' : 'dark:invert'}`} 
            alt="App Logo" 
          />
          <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
            isDark 
              ? 'bg-neutral-900 text-neutral-400 border-neutral-800/50' 
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200/30 dark:border-neutral-700/30'
          }`}>
            {tag}
          </span>
        </div>
        <h3 className={`text-sm font-semibold tracking-tight leading-tight ${isDark ? 'text-white' : 'text-neutral-800 dark:text-neutral-100'}`}>
          {title}
        </h3>

        {/* Binder / spine crease */}
        {/* 1. Binder spine gradient shadow */}
        <div className={`absolute left-0 top-0 bottom-0 w-[17px] rounded-l-sm bg-gradient-to-r pointer-events-none ${
          isDark 
            ? 'from-white/[0.04] via-transparent to-black/[0.3]' 
            : 'from-black/[0.08] via-transparent to-black/[0.12] dark:from-white/[0.03] dark:to-black/[0.2]'
        }`} />
        {/* 2. Spine crease line */}
        <div className={`absolute left-[17px] top-0 bottom-0 w-[1px] pointer-events-none ${
          isDark ? 'bg-neutral-800/80' : 'bg-neutral-300/60 dark:bg-neutral-800/60'
        }`} />
        {/* 3. Highlight adjacent to crease */}
        <div className={`absolute left-[18px] top-0 bottom-0 w-[1px] pointer-events-none ${
          isDark ? 'bg-white/[0.02]' : 'bg-white/50 dark:bg-white/[0.02]'
        }`} />
      </div>
    </>
  );

  if (to) {
    return (
      <Link 
        to={to} 
        className={`group relative select-none w-[140px] h-[182px] [perspective:1000px] block ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <div 
      onClick={disabled ? undefined : onClick}
      className={`group relative select-none w-[140px] h-[182px] [perspective:1000px] ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
    >
      {cardContent}
    </div>
  );
}

// Estimated pricing based on WhatsApp Marketing conversation rates in Malaysia (RM 0.3467)
const MARKETING_RATE_MYR = 0.3467;

const CUSTOMER_STEPS = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
  2000, 3000, 4000, 5000, 10000, 15000, 20000, 25000, 50000, 75000, 100000
];

function formatReplyRate(
  messagesSentCount: number | undefined,
  repliesReceivedCount: number | undefined,
): string {
  const sent = messagesSentCount ?? 0;
  const replied = repliesReceivedCount ?? 0;
  if (sent === 0) return '—';
  return `${((replied / sent) * 100).toFixed(1)}%`;
}

export default function BroadcastPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canManage = can(Permission.BROADCAST_MANAGE);

  const schedules = useQuery(api.whatsappBroadcast.listSchedulesForAgent, {
    agentId: agentId as any,
  });
  const deleteSchedule = useMutation(api.whatsappBroadcast.deleteScheduleRecord);



  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const handleDelete = async (scheduleId: any) => {
    setDeletingIds((prev) => [...prev, scheduleId]);
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      await deleteSchedule({ scheduleId });
      toast.success('Broadcast campaign record deleted successfully.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to delete: ${msg}`);
      setDeletingIds((prev) => prev.filter((id) => id !== scheduleId));
    }
  };

  // Dialog States
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [isBanGuideOpen, setIsBanGuideOpen] = useState(false);
  const [banGuideStep, setBanGuideStep] = useState(0);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorCustomersIndex, setCalculatorCustomersIndex] = useState(13); // Default index for 5000
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [targetSchedule, setTargetSchedule] = useState<{ id: string; isPending: boolean } | null>(null);

  const calculatorCustomers = CUSTOMER_STEPS[calculatorCustomersIndex];
  const estimatedPrice = calculatorCustomers * MARKETING_RATE_MYR;

  return (
    <WhatsAppFeatureGate feature="Broadcast">
    <div className="flex w-full flex-col gap-8">
      {/* Page Header */}
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              <SiWhatsapp className="size-3 text-[#25D366]" />
              WhatsApp only
            </span>
          </div>
          <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">Broadcast</h1>
        </div>
        {canManage && (
          <div className="flex shrink-0">
            <Button asChild className="gap-1.5 font-semibold">
              <Link to={`/dashboard/${agentId}/broadcast/new`}>
                <Plus className="size-4" />
                Create a new broadcast
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* Top Part: Interactive book cards */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Guides</h2>
        <div className="flex flex-wrap items-end gap-6 max-w-[920px]">
          <BookCard
            tag={OVERVIEW_VARIANT_META.broadcast.tag}
            title={OVERVIEW_VARIANT_META.broadcast.bookTitle}
            onClick={() => { setWalkthroughStep(0); setIsWalkthroughOpen(true); }}
          />

          <BookCard
            tag={BAN_GUIDE_META.tag}
            title={BAN_GUIDE_META.bookTitle}
            onClick={() => { setBanGuideStep(0); setIsBanGuideOpen(true); }}
          />

          {/* Estimate Cost Calculator */}
          <BookCard
            tag="Calculator"
            title="Cost Calculator"
            onClick={() => setIsCalculatorOpen(true)}
          />

        </div>
      </section>

      {/* Bottom Part: Historical Broadcasts */}
      <section className="flex flex-col gap-4 mt-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Broadcast History</h2>
          <Separator className="mt-3" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3.5 text-left align-middle font-semibold text-muted-foreground">Campaign Name</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Scheduled Time</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Recipients</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Status</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Reply rate</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Est. Cost</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedules === undefined ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        Loading schedules...
                      </div>
                    </td>
                  </tr>
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                      No broadcast campaigns found.
                    </td>
                  </tr>
                ) : (
                  schedules.map((bc) => {
                    const totalRecipients = bc.totalCount;
                    const dateFormatted = new Date(bc.scheduledAt).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    });
                    
                    let statusBg = "bg-muted/40 border-border text-muted-foreground";
                    let statusDot = "bg-neutral-500";
                    if (bc.status === 'completed') {
                      statusBg = "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
                      statusDot = "bg-emerald-500";
                    } else if (bc.status === 'processing') {
                      statusBg = "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
                      statusDot = "bg-blue-500";
                    } else if (bc.status === 'pending') {
                      statusBg = "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
                      statusDot = "bg-amber-500";
                    } else if (bc.status === 'failed') {
                      statusBg = "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400";
                      statusDot = "bg-rose-500";
                    } else if (bc.status === 'cancelled') {
                      statusBg = "bg-neutral-500/10 border-neutral-500/20 text-neutral-500";
                      statusDot = "bg-neutral-400";
                    }

                    // Estimate cost (RM 0.3467 per template send)
                    const costRm = totalRecipients * 0.3467;

                    const isDeleting = deletingIds.includes(bc._id);

                    return (
                      <tr 
                        key={bc._id} 
                        onClick={() => navigate(`/dashboard/${agentId}/broadcast/${bc._id}`)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-muted/10",
                          isDeleting && "animate-row-delete pointer-events-none"
                        )}
                      >
                        <td className="px-5 py-4 align-middle text-left font-semibold text-foreground truncate max-w-[200px]">
                          {bc.templateName}
                        </td>
                        <td className="px-5 py-4 align-middle text-center text-muted-foreground">{dateFormatted}</td>
                        <td className="px-5 py-4 align-middle text-center text-foreground">
                          {bc.status === 'completed'
                            ? `${bc.okCount ?? 0} / ${totalRecipients}`
                            : totalRecipients}
                        </td>
                        <td className="px-5 py-4 align-middle text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                            statusBg
                          )}>
                            <span className={cn("size-1.5 rounded-full", statusDot)} />
                            {bc.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-middle text-center font-medium text-foreground">
                          {formatReplyRate(
                            bc.status === 'completed' ? bc.okCount : undefined,
                            undefined,
                          )}
                        </td>
                        <td className="px-5 py-4 align-middle text-center font-medium text-foreground">
                          RM {costRm.toFixed(2)}
                        </td>
                        <td
                          className="px-5 py-4 align-middle text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canManage ? (
                            <div className="flex justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Actions"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTargetSchedule({ id: bc._id, isPending: bc.status === 'pending' });
                                    setConfirmDialogOpen(true);
                                  }}
                                  className="cursor-pointer font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <BroadcastOverviewDialog
        open={isWalkthroughOpen}
        onOpenChange={setIsWalkthroughOpen}
        step={walkthroughStep}
        onStepChange={setWalkthroughStep}
        ctaHref={canManage ? `/dashboard/${agentId}/broadcast/new` : undefined}
      />

      <WhatsAppBanGuideDialog
        open={isBanGuideOpen}
        onOpenChange={setIsBanGuideOpen}
        step={banGuideStep}
        onStepChange={setBanGuideStep}
      />

      {/* Cost Estimator Calculator Dialog */}
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="sm:max-w-[680px] rounded-3xl bg-white dark:bg-[#121212] border border-border/60 p-8">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-3xl font-semibold tracking-tight text-foreground">
              Cost Calculator
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5">
              {/* Slider 1: Number of Customers */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-semibold text-foreground">
                    Number of Customers
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight text-foreground">
                      {calculatorCustomers.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {calculatorCustomers === 1 ? 'customer' : 'customers'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Slider
                    value={[calculatorCustomersIndex]}
                    onValueChange={(val) => setCalculatorCustomersIndex(val[0])}
                    min={0}
                    max={CUSTOMER_STEPS.length - 1}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground/80 font-semibold mt-0.5">
                    <span>100</span>
                    <span>100k</span>
                  </div>
                </div>
              </div>

            </div>
 
             {/* Layout box identical to the user mockup screenshot */}
             <div className="rounded-3xl border border-border bg-white dark:bg-[#1a1a1a] p-6 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  {/* Total Messages */}
                  <div className="flex flex-col shrink-0">
                    <span className="text-lg font-medium tracking-tight text-foreground whitespace-nowrap">
                      {calculatorCustomers.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground/80 mt-1 whitespace-nowrap">
                      Total Messages
                    </span>
                  </div>

                  <X className="size-3.5 text-muted-foreground/60 shrink-0" />

                  {/* Rate per message */}
                  <div className="flex flex-col shrink-0">
                    <span className="text-lg font-medium tracking-tight text-foreground whitespace-nowrap">
                      ~ RM 0.3467
                    </span>
                    <span className="text-xs text-muted-foreground/80 mt-1 whitespace-nowrap">
                      Est. Rate / Msg
                    </span>
                  </div>

                  <Equal className="size-3.5 text-muted-foreground/60 shrink-0" />

                  {/* Final estimated cost — largest and boldest */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-3xl font-semibold tracking-tight text-foreground whitespace-nowrap">
                      ~ RM {estimatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 whitespace-nowrap">Est. Total Cost</span>
                  </div>
                </div>
 
               <div className="border-t border-border/60 pt-4">
                 <p className="text-sm text-foreground leading-relaxed">
                   We will broadcast to <strong className="font-semibold">{calculatorCustomers.toLocaleString()}</strong> customers.
                 </p>
               </div>

              {canManage ? (
                <Button asChild className="w-full bg-[#1a1a1a] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-xl h-11 text-sm font-semibold">
                  <Link to={`/dashboard/${agentId}/broadcast/new`} onClick={() => setIsCalculatorOpen(false)}>
                    Get started
                  </Link>
                </Button>
              ) : (
                <Button disabled className="w-full rounded-xl h-11 text-sm font-semibold">
                  Get started
                </Button>
              )}

              <ul className="flex flex-col gap-2.5 pt-2">
                <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <div className="flex size-4 shrink-0 items-center justify-center text-foreground mt-0.5">
                    <Check className="size-3 stroke-[2.5]" />
                  </div>
                  <span>
                    Based on official WhatsApp marketing rate (RM 0.3467 / message). See{' '}
                    <a 
                      href="https://whatsappbusiness.com/products/platform-pricing/?country=Malaysia&currency=Malaysian%20Ringgit%20(MYR)&category=Marketing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:underline inline-flex items-center gap-0.5 font-semibold"
                    >
                      Official WhatsApp Pricing <ChevronRight className="size-2.5" />
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <div className="flex size-4 shrink-0 items-center justify-center text-foreground mt-0.5">
                    <Check className="size-3 stroke-[2.5]" />
                  </div>
                  <span>RM0 platform fee — pay exactly what Meta charges you</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <div className="flex size-4 shrink-0 items-center justify-center text-foreground mt-0.5">
                    <Check className="size-3 stroke-[2.5]" />
                  </div>
                  <span>Billed directly by Meta (no payment through Kilobot)</span>
                </li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="rounded-3xl bg-white dark:bg-[#121212] border border-border/60 p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              {targetSchedule?.isPending ? 'Cancel broadcast' : 'Delete broadcast history'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {targetSchedule?.isPending
                ? 'Are you sure you want to cancel this scheduled broadcast? This action cannot be undone.'
                : 'Are you sure you want to delete this broadcast record from your history? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setTargetSchedule(null);
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (targetSchedule) {
                  await handleDelete(targetSchedule.id);
                  setConfirmDialogOpen(false);
                  setTargetSchedule(null);
                }
              }}
              className="rounded-xl"
            >
              {targetSchedule?.isPending ? 'Confirm cancel' : 'Confirm delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes row-delete {
          0% {
            opacity: 1;
            transform: translateX(0);
            background-color: rgba(239, 68, 68, 0.05);
          }
          30% {
            background-color: rgba(239, 68, 68, 0.12);
          }
          100% {
            opacity: 0;
            transform: translateX(-20px);
            background-color: rgba(239, 68, 68, 0);
          }
        }
        .animate-row-delete {
          animation: row-delete 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
    </WhatsAppFeatureGate>
  );
}
