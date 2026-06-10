import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { SiWhatsapp } from 'react-icons/si';
import { Plus, Check, X, Equal, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { PageDescription } from '@/components/PageDescription';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { WhatsAppFeatureGate } from '@/components/WhatsAppFeatureGate';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import {
  FollowUpOverviewDialog,
  OVERVIEW_VARIANT_META,
} from '@/components/WhatsAppFeatureOverviewDialog';
import { getLeadTemperatureStyle } from '@/lib/leadTemperature';

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
      <div className="absolute inset-0 rounded-r-[14px] rounded-l-sm bg-white dark:bg-[#1a1a1a] border border-neutral-200/80 dark:border-neutral-800/80 shadow-inner z-0 transition-transform duration-500 ease-out group-hover:translate-x-1.5" />
      <div 
        style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
        className={`absolute inset-0 rounded-r-[14px] rounded-l-sm border pl-[25px] pr-3.5 py-3.5 flex flex-col justify-between transition-transform duration-500 ease-out group-hover:[transform:rotateY(-24deg)] z-20 shadow-md group-hover:shadow-lg origin-left ${
          isDark 
            ? 'bg-neutral-950 dark:bg-black border-neutral-900 text-white' 
            : 'bg-[#fafafa] dark:bg-[#202020] border-neutral-200/80 dark:border-neutral-800/80 text-neutral-800 dark:text-neutral-100'
        }`}
      >
        <div className="flex flex-col gap-2">
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
        <div className={`absolute left-0 top-0 bottom-0 w-[17px] rounded-l-sm bg-gradient-to-r pointer-events-none ${
          isDark 
            ? 'from-white/[0.04] via-transparent to-black/[0.3]' 
            : 'from-black/[0.08] via-transparent to-black/[0.12] dark:from-white/[0.03] dark:to-black/[0.2]'
        }`} />
        <div className={`absolute left-[17px] top-0 bottom-0 w-[1px] pointer-events-none ${
          isDark ? 'bg-neutral-800/80' : 'bg-neutral-300/60 dark:bg-neutral-800/60'
        }`} />
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

function formatEstimatedCostSoFar(
  messagesSentCount: number | undefined,
  estimatedCostPerCustomer: number | undefined,
  maxAttempts: number,
): string {
  const sent = messagesSentCount ?? 0;
  if (estimatedCostPerCustomer === undefined || maxAttempts < 1) {
    return sent === 0 ? 'RM 0.00' : '—';
  }
  const costPerMessage = estimatedCostPerCustomer / maxAttempts;
  return `RM ${(sent * costPerMessage).toFixed(2)}`;
}

function getTagColorClass(tag: string): { bg: string; text: string; dot: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 6;
  const dotColors = [
    'bg-blue-500 dark:bg-blue-400',
    'bg-emerald-500 dark:bg-emerald-400',
    'bg-violet-500 dark:bg-violet-400',
    'bg-amber-500 dark:bg-amber-400',
    'bg-rose-500 dark:bg-rose-400',
    'bg-cyan-500 dark:bg-cyan-400',
  ];
  return {
    bg: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-none',
    text: 'text-zinc-800 dark:text-zinc-200',
    dot: dotColors[index],
  };
}

export default function FollowUpPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  
  const { can } = usePermissions();
  const canManage = can(Permission.FOLLOWUPS_MANAGE);

  // Queries & Mutations
  const rules = useQuery(
    api.whatsappFollowUp.listFollowUpRules,
    typedAgentId ? { agentId: typedAgentId } : 'skip'
  );
  const deleteRule = useMutation(api.whatsappFollowUp.deleteFollowUpRule);
  const setRuleActive = useMutation(api.whatsappFollowUp.setFollowUpRuleActive);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [followUpToCancel, setFollowUpToCancel] = useState<Id<'followUpRules'> | null>(null);
  const [deletingIds, setDeletingIds] = useState<Id<'followUpRules'>[]>([]);

  const handleCancelFollowUp = async (id: Id<'followUpRules'>) => {
    setDeletingIds((prev) => [...prev, id]);
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      await deleteRule({ id });
      toast.success('Follow-up rule deleted successfully.');
    } catch (e) {
      toast.error('Failed to delete follow-up rule.');
    } finally {
      setDeletingIds((prev) => prev.filter((dId) => dId !== id));
    }
  };

  const handleSetActive = async (id: Id<'followUpRules'>, isActive: boolean) => {
    try {
      await setRuleActive({ id, isActive });
      toast.success(isActive ? 'Follow-up turned on' : 'Follow-up turned off');
    } catch (e) {
      toast.error('Failed to update follow-up.');
    }
  };

  // Dialog States
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorCustomersIndex, setCalculatorCustomersIndex] = useState(13); 
  const [calculatorFollowUps, setCalculatorFollowUps] = useState(3);

  const calculatorCustomers = CUSTOMER_STEPS[calculatorCustomersIndex];
  const estimatedPrice = calculatorCustomers * calculatorFollowUps * MARKETING_RATE_MYR;

  if (rules === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <WhatsAppFeatureGate feature="Follow-ups">
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
          <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">Follow-ups</h1>
          <PageDescription>
            Automatically message customers who haven&apos;t replied yet.
          </PageDescription>
        </div>
        {canManage && (
          <div className="flex shrink-0">
            <Button asChild className="gap-1.5 font-semibold">
              <Link to={`/dashboard/${agentId}/follow-ups/new`}>
                <Plus className="size-4" />
                Create a follow-up
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* Top Part: Guides */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Guides</h2>
        <div className="flex flex-wrap items-end gap-6 max-w-[700px]">
          <BookCard
            tag={OVERVIEW_VARIANT_META['follow-up'].tag}
            title={OVERVIEW_VARIANT_META['follow-up'].bookTitle}
            onClick={() => { setWalkthroughStep(0); setIsWalkthroughOpen(true); }}
          />
          <BookCard
            tag="Calculator"
            title="Cost Calculator"
            onClick={() => setIsCalculatorOpen(true)}
          />
        </div>
      </section>

      {/* Bottom Part: Rules table */}
      <section className="flex flex-col gap-4 mt-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Active Follow-ups</h2>
          <Separator className="mt-3" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3.5 text-left align-middle font-semibold text-muted-foreground">Name</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Audience</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Follow-ups sent</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Reply rate</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Est. Cost</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Active</th>
                  <th className="px-5 py-3.5 text-center align-middle font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                      No active follow-up rules found.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => {
                    const isDeleting = deletingIds.includes(rule._id);

                    return (
                      <tr 
                        key={rule._id} 
                        onClick={() => navigate(`/dashboard/${agentId}/follow-ups/${rule._id}`)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-muted/10",
                          isDeleting && "animate-row-delete pointer-events-none"
                        )}
                      >
                        <td className="px-5 py-4 align-middle text-left font-semibold text-foreground">{rule.name}</td>
                        <td className="px-5 py-4 align-middle text-center">
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {rule.audienceLeadTemperatures.map((temp) => {
                              const style = getLeadTemperatureStyle(temp);
                              const Icon = style.icon;
                              return (
                                <span
                                  key={temp}
                                  className={cn(
                                    'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 py-0 text-[10px] font-semibold leading-none',
                                    style.bg,
                                    style.text,
                                  )}
                                >
                                  <Icon className={cn('size-3 shrink-0', style.iconClass)} />
                                  {temp}
                                </span>
                              );
                            })}
                            {rule.audienceTags?.map((tag) => {
                              const tagStyle = getTagColorClass(tag);
                              return (
                                <span
                                  key={tag}
                                  className={cn(
                                    'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 py-0 text-[10px] font-semibold leading-none',
                                    tagStyle.bg,
                                    tagStyle.text,
                                  )}
                                >
                                  <span className={cn('size-1.5 shrink-0 rounded-full', tagStyle.dot)} />
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle text-center font-medium text-foreground">
                          {(rule.messagesSentCount ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 align-middle text-center font-medium text-foreground">
                          {formatReplyRate(rule.messagesSentCount, rule.repliesReceivedCount)}
                        </td>
                        <td className="px-5 py-4 align-middle text-center font-medium text-foreground">
                          {formatEstimatedCostSoFar(
                            rule.messagesSentCount,
                            rule.estimatedCostPerCustomer,
                            rule.maxAttempts,
                          )}
                        </td>
                        <td
                          className="px-5 py-4 align-middle text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-center">
                            <Switch
                              checked={rule.isActive}
                              onCheckedChange={(checked) => handleSetActive(rule._id, checked)}
                              disabled={!canManage}
                              aria-label={`${rule.isActive ? 'Turn off' : 'Turn on'} ${rule.name}`}
                              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-input"
                            />
                          </div>
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
                                    setFollowUpToCancel(rule._id);
                                    setCancelDialogOpen(true);
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

      <FollowUpOverviewDialog
        open={isWalkthroughOpen}
        onOpenChange={setIsWalkthroughOpen}
        step={walkthroughStep}
        onStepChange={setWalkthroughStep}
        ctaHref={canManage ? `/dashboard/${agentId}/follow-ups/new` : undefined}
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
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-semibold text-foreground">
                    Number of Customers
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white">
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

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-semibold text-foreground">
                    Number of Follow-ups
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                      {calculatorFollowUps}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {calculatorFollowUps === 1 ? 'follow-up' : 'follow-ups'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Slider
                    value={[calculatorFollowUps]}
                    onValueChange={(val) => setCalculatorFollowUps(val[0])}
                    min={1}
                    max={5}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground/80 font-semibold mt-0.5">
                    <span>1</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-white dark:bg-[#1a1a1a] p-6 flex flex-col gap-6">
              <div className="flex items-start justify-between">
                <div className="flex flex-col shrink-0">
                  <span className="text-lg font-semibold tracking-tight text-neutral-950 dark:text-white whitespace-nowrap">
                    {(calculatorCustomers * calculatorFollowUps).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground/80 mt-1 whitespace-nowrap">
                    Total Messages
                  </span>
                </div>

                <X className="size-3.5 text-muted-foreground/50 shrink-0 mt-[5px]" />

                <div className="flex flex-col shrink-0">
                  <span className="text-lg font-medium tracking-tight text-foreground whitespace-nowrap">
                    ~ RM 0.3467
                  </span>
                  <span className="text-xs text-muted-foreground/80 mt-1 whitespace-nowrap">
                    Est. Rate / Msg
                  </span>
                </div>

                <Equal className="size-3.5 text-muted-foreground/50 shrink-0 mt-[5px]" />

                <div className="flex flex-col">
                  <span className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white whitespace-nowrap">
                    ~ RM {estimatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground/80 mt-1 whitespace-nowrap">Est. Total Cost</span>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <p className="text-sm text-foreground leading-relaxed">
                  We will follow up on <strong className="font-semibold">{calculatorCustomers.toLocaleString()}</strong> customers, maximum <strong className="font-semibold">{calculatorFollowUps}</strong> times.
                </p>
              </div>

              {canManage ? (
                <Button asChild className="w-full bg-[#1a1a1a] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-xl h-11 text-sm font-semibold">
                  <Link to={`/dashboard/${agentId}/follow-ups/new`} onClick={() => setIsCalculatorOpen(false)}>
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
                    See{' '}
                    <a 
                      href="https://whatsappbusiness.com/products/platform-pricing/?country=Malaysia&currency=Malaysian%20Ringgit%20(MYR)&category=Marketing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:underline inline-flex items-center gap-0.5 font-semibold"
                    >
                      Official WhatsApp Pricing
                    </a>
                    {' '}here. 
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

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="rounded-3xl bg-white dark:bg-[#121212] border border-border/60 p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              Delete follow-up rule
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete this follow-up rule? Active customer follow-ups using this rule will stop. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setFollowUpToCancel(null);
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (followUpToCancel) {
                  handleCancelFollowUp(followUpToCancel);
                  setCancelDialogOpen(false);
                  setFollowUpToCancel(null);
                }
              }}
              className="rounded-xl"
            >
              Confirm delete
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
