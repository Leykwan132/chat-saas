import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  CalendarClock,
  Check,
  FileText,
  Megaphone,
  MessageCircle,
  Percent,
  Plus,
  Repeat,
  Rocket,
  Send,
  Timer,
  User,
  Users,
  X,
  Zap,
  Search,
  AlertCircle,
  Lightbulb,
  SquareCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLeadTemperatureStyle, type LeadTemperature } from '@/lib/leadTemperature';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { DotPattern } from '@/components/ui/dot-pattern';
import { Marquee } from '@/components/ui/marquee';
import { AnimatedList, AnimatedListItem } from '@/components/ui/animated-list';

export type WhatsAppOverviewVariant = 'broadcast' | 'follow-up';

export const OVERVIEW_VARIANT_META = {
  broadcast: {
    tag: 'Broadcast',
    bookTitle: 'Overview',
    dialogLabel: 'Overview',
  },
  'follow-up': {
    tag: 'Follow-ups',
    bookTitle: 'Overview',
    dialogLabel: 'Overview',
  },
} as const satisfies Record<
  WhatsAppOverviewVariant,
  { tag: string; bookTitle: string; dialogLabel: string }
>;

type FeatureScenario = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type OverviewVisual = 'features' | 'workflowStep';

type WorkflowStepConfig = {
  stepNumber: number;
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
  note?: string;
};

type OverviewStep = {
  title: string;
  description: string;
  sectionTitle: string;
  points: string[];
  visual: OverviewVisual;
  note?: string;
  stepNumber?: number;
  stepIcon?: LucideIcon;
  stepCardTitle?: string;
  stepCardDescription?: string;
};

const BROADCAST_SCENARIOS: FeatureScenario[] = [
  {
    icon: Percent,
    title: 'Flash sale',
    description: 'Tell your list about a limited-time discount.',
  },
  {
    icon: Rocket,
    title: 'Product launch',
    description: 'Announce something new you are selling.',
  },
  {
    icon: CalendarClock,
    title: 'Event reminder',
    description: 'Remind people before a webinar or booking.',
  },
];

const FOLLOW_UP_SCENARIOS: FeatureScenario[] = [
  {
    icon: MessageCircle,
    title: 'Conversation left off',
    description: 'Follow up when the chat goes quiet.',
  },
  {
    icon: CalendarClock,
    title: 'Post-meeting',
    description: 'Follow up after the appointment or call.',
  },
  {
    icon: Repeat,
    title: 'Multiple follow-ups',
    description: 'Send up to 5–6 messages until they reply.',
  },
];

const BROADCAST_WORKFLOW: WorkflowStepConfig[] = [
  {
    stepNumber: 1,
    icon: FileText,
    title: 'Prepare Meta template',
    description: 'Draft your broadcast message and submit it to Meta for category approval.',
    points: [
      'Ensure you choose the correct template type (marketing / utility)',
      'Fully utilize your template layout by attaching a media image',
    ],
    note: 'Meta charges different rates based on template category. Try using Utility templates first before using Marketing templates to optimize your costs.',
  },
  {
    stepNumber: 2,
    icon: Users,
    title: 'Target your audience',
    description: 'Define exactly who should receive your WhatsApp broadcast campaign.',
    points: [
      'Filter your audience to target warm or hot leads',
      'Limit messaging to cold leads to manage costs (each outbound message costs 35 cents)',
    ],
    note: "Avoid messaging users who haven't opted in. This is the primary reason accounts get flagged for spam and suspended by Meta.",
  },
  {
    stepNumber: 3,
    icon: Megaphone,
    title: 'Kilobot streamlines',
    description: 'Manage templates and schedule broadcast campaigns all in one place.',
    points: [
      'Manage Meta message templates entirely on our platform',
      'Let Kilobot handle scheduling and message delivery',
    ],
  },
];

const FOLLOW_UP_WORKFLOW: WorkflowStepConfig[] = [
  {
    stepNumber: 1,
    icon: FileText,
    title: 'Prepare Meta template',
    description: 'Create approved message templates to follow up after a conversation window closes.',
    points: [
      'Ensure you choose the correct template type (marketing / utility)',
      'Fully utilize your template layout by attaching a media image',
    ],
    note: 'Meta charges different rates based on template category. Try using Utility templates first before using Marketing templates to optimize your costs.',
  },
  {
    stepNumber: 2,
    icon: Timer,
    title: 'Set trigger rules',
    description: 'Define the inactivity criteria that will trigger the automated message.',
    points: [
      'Target warm leads to keep follow-ups cost-effective',
      'Choose the best delay time to follow up',
      'Review performance and adjust rules regularly',
    ],
    note: 'Each follow-up costs ~RM0.35, so select your audience and number of attempts carefully.',
  },
  {
    stepNumber: 3,
    icon: Send,
    title: 'Kilobot streamlines',
    description: 'Manage templates and schedule automated delivery all in one place.',
    points: [
      'Manage Meta message templates entirely on our platform',
      'Let Kilobot handle scheduling and message delivery',
    ],
  },
];

/** Fixed slide body height so the right-panel grid/bg always fills the visual area. */
const OVERVIEW_SLIDE_HEIGHT_CLASS =
  'h-[min(440px,calc(90vh-5.5rem))] min-h-[400px]';

function getFeatureScenarios(variant: WhatsAppOverviewVariant): FeatureScenario[] {
  return variant === 'broadcast' ? BROADCAST_SCENARIOS : FOLLOW_UP_SCENARIOS;
}

function workflowToOverviewStep(step: WorkflowStepConfig): OverviewStep {
  return {
    title: `${step.stepNumber}. ${step.title}`,
    description: step.description,
    sectionTitle: step.stepNumber === 3 ? 'Kilobot enables' : 'Key Checklist',
    points: step.points,
    visual: 'workflowStep',
    note: step.note,
    stepNumber: step.stepNumber,
    stepIcon: step.icon,
    stepCardTitle: step.title,
    stepCardDescription: step.description,
  };
}

function getSteps(variant: WhatsAppOverviewVariant): OverviewStep[] {
  const featureStep: OverviewStep =
    variant === 'broadcast'
      ? {
          title: 'WhatsApp broadcasts',
          description:
            'Send the same official WhatsApp message to many customers in one campaign.',
          sectionTitle: 'Most common scenarios',
          points: [],
          visual: 'features',
        }
      : {
          title: 'Automated follow-ups',
          description:
            'Send WhatsApp templates automatically when timing or silence triggers your rules.',
          sectionTitle: 'Most common scenarios',
          points: [],
          visual: 'features',
        };

  const workflow =
    variant === 'broadcast' ? BROADCAST_WORKFLOW : FOLLOW_UP_WORKFLOW;

  return [featureStep, ...workflow.map(workflowToOverviewStep)];
}

interface WhatsAppFeatureOverviewDialogProps {
  variant: WhatsAppOverviewVariant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: number;
  onStepChange: (step: number) => void;
  ctaHref?: string;
}

export function WhatsAppFeatureOverviewDialog({
  variant,
  open,
  onOpenChange,
  step,
  onStepChange,
  ctaHref,
}: WhatsAppFeatureOverviewDialogProps) {
  const meta = OVERVIEW_VARIANT_META[variant];
  const steps = getSteps(variant);
  const stepCount = steps.length;
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(step);
  const [featuresAnimKey, setFeaturesAnimKey] = useState(0);

  const handleOpenChange = (next: boolean) => {
    if (!next) onStepChange(0);
    onOpenChange(next);
  };

  useEffect(() => {
    if (!api || !open) return;
    api.scrollTo(step, true);
    setActiveIndex(step);
  }, [api, step, open]);

  useEffect(() => {
    if (open && activeIndex === 0) {
      setFeaturesAnimKey((k) => k + 1);
    }
  }, [open, activeIndex]);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      const index = api.selectedScrollSnap();
      setActiveIndex(index);
      onStepChange(index);
    };

    api.on('select', onSelect);
    onSelect();

    return () => {
      api.off('select', onSelect);
    };
  }, [api, onStepChange]);

  const isLastSlide = activeIndex >= stepCount - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[880px]">
        <DialogTitle className="sr-only">{meta.dialogLabel}</DialogTitle>
        <Carousel setApi={setApi} opts={{ startIndex: step, watchDrag: true }} className="w-full">
          <CarouselContent className={cn('ml-0', OVERVIEW_SLIDE_HEIGHT_CLASS)}>
            {steps.map((slide, slideIndex) => (
              <CarouselItem
                key={slide.title}
                className={cn('h-full basis-full pl-0', OVERVIEW_SLIDE_HEIGHT_CLASS)}
              >
                <div className="flex h-full w-full flex-col overflow-hidden md:flex-row md:items-stretch">
                  <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-y-auto px-6 py-6 sm:px-10 md:overflow-visible md:py-10">
                    <div className="flex flex-col gap-2.5">
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {slide.title}
                      </h2>
                      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                        {slide.description}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        {slide.sectionTitle}
                      </h3>
                      <ul className="flex flex-col gap-2.5">
                        {slide.visual === 'features'
                          ? getFeatureScenarios(variant).map((scenario) => (
                              <li
                                key={scenario.title}
                                className="flex items-center gap-2.5"
                              >
                                <Lightbulb
                                  className="size-4 shrink-0 text-foreground"
                                  strokeWidth={2}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {scenario.title}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {scenario.description}
                                  </p>
                                </div>
                              </li>
                            ))
                          : slide.points.map((point) => {
                              const ChecklistIcon = slide.stepNumber === 3 ? Check : SquareCheck;
                              return (
                                <li
                                  key={point}
                                  className="flex items-center gap-2.5 text-sm leading-snug text-foreground/90"
                                >
                                  <ChecklistIcon
                                    className="size-4 shrink-0 text-foreground"
                                    strokeWidth={ChecklistIcon === Check ? 2.5 : 2}
                                  />
                                  <span>{point}</span>
                                </li>
                              );
                            })}
                      </ul>
                    </div>
                    {slide.note && (
                      <div className="rounded-xl border border-border/70 bg-muted/40 p-3 flex gap-2.5 items-start mt-1">
                        <AlertCircle className="size-4 text-muted-foreground shrink-0 mt-0.5" strokeWidth={2} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Note</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{slide.note}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      'relative h-[min(240px,38vh)] shrink-0 overflow-hidden border-t border-border/40 bg-muted/15 md:h-full md:border-t-0 md:border-l',
                      'md:w-[44%]',
                    )}
                  >
                      <DotPattern
                        width={20}
                        height={20}
                        cx={1}
                        cy={1}
                        cr={1}
                        className={cn(
                          "[mask-image:radial-gradient(400px_circle_at_center,transparent,white)]",
                          "text-zinc-400/40 dark:text-white/15"
                        )}
                      />
                    <div
                      className={cn(
                        'relative z-10 flex size-full items-center justify-center',
                        (slide.visual === 'workflowStep' && slide.stepNumber === 1) ||
                          (slide.visual === 'workflowStep' && slide.stepNumber === 2 && variant === 'follow-up')
                          ? 'p-0'
                          : 'p-6 md:p-8',
                      )}
                    >
                      <div className={cn(
                        "w-full transition-all duration-500",
                        (slide.visual === 'workflowStep' && slide.stepNumber === 1) ||
                          (slide.visual === 'workflowStep' && slide.stepNumber === 2 && variant === 'follow-up')
                          ? "max-w-full h-full"
                          : "max-w-[280px]"
                      )}>
                        <SlideVisual
                          visual={slide.visual}
                          variant={variant}
                          isActive={open && activeIndex === slideIndex}
                          animKey={featuresAnimKey}
                          stepNumber={slide.stepNumber}
                          stepIcon={slide.stepIcon}
                          stepCardTitle={slide.stepCardTitle}
                          stepCardDescription={slide.stepCardDescription}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="flex items-center justify-between gap-4 border-t border-border/40 px-6 py-4 sm:px-8">
            <CarouselPrevious
              variant="outline"
              size="icon-sm"
              className="static size-9 translate-x-0 translate-y-0 rounded-full"
            />
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => api?.scrollTo(i)}
                  className={cn(
                    'size-1.5 rounded-full transition-colors',
                    i === activeIndex ? 'bg-foreground' : 'bg-border hover:bg-muted-foreground/40',
                  )}
                />
              ))}
            </div>
            {isLastSlide ? (
              <div className="flex items-center">
                {ctaHref ? (
                  <Button
                    asChild
                    size="sm"
                    className="gap-1.5 font-semibold"
                    onClick={() => onOpenChange(false)}
                  >
                    <Link to={ctaHref}>
                      <Plus className="size-3.5" />
                      {variant === 'broadcast' ? 'Create broadcast' : 'Create follow-up'}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-w-[4.5rem] font-semibold"
                    onClick={() => onOpenChange(false)}
                  >
                    Got it
                  </Button>
                )}
              </div>
            ) : (
              <CarouselNext
                variant="outline"
                size="icon-sm"
                className="static size-9 translate-x-0 translate-y-0 rounded-full"
              />
            )}
          </div>
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}

type OverviewDialogProps = Omit<WhatsAppFeatureOverviewDialogProps, 'variant'>;

export function BroadcastOverviewDialog(props: OverviewDialogProps) {
  return <WhatsAppFeatureOverviewDialog variant="broadcast" {...props} />;
}

export function FollowUpOverviewDialog(props: OverviewDialogProps) {
  return <WhatsAppFeatureOverviewDialog variant="follow-up" {...props} />;
}

function SlideVisual({
  visual,
  variant,
  isActive,
  animKey,
  stepNumber,
}: {
  visual: OverviewVisual;
  variant: WhatsAppOverviewVariant;
  isActive: boolean;
  animKey: number;
  stepNumber?: number;
  stepIcon?: LucideIcon;
  stepCardTitle?: string;
  stepCardDescription?: string;
}) {
  if (visual === 'features') {
    return <FeaturesVisual variant={variant} isActive={isActive} animKey={animKey} />;
  }
  if (visual === 'workflowStep' && stepNumber) {
    if (variant === 'broadcast') {
      if (stepNumber === 1) return <BroadcastStep1Visual isActive={isActive} />;
      if (stepNumber === 2) return <BroadcastStep2Visual isActive={isActive} />;
      if (stepNumber === 3) return <BroadcastStep3Visual isActive={isActive} />;
    } else {
      if (stepNumber === 1) return <FollowUpStep1Visual isActive={isActive} />;
      if (stepNumber === 2) return <FollowUpStep2Visual isActive={isActive} />;
      if (stepNumber === 3) return <FollowUpStep3Visual isActive={isActive} />;
    }
  }
  return null;
}

function TemplateApprovalVisual({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex size-full items-center justify-center overflow-hidden">
      <img
        src="/sample-template.png"
        alt="Meta message template example"
        className={cn(
          "max-h-full max-w-full object-contain transition-all duration-700 ease-out transform",
          isActive ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        )}
      />
    </div>
  );
}

function BroadcastStep1Visual({ isActive }: { isActive: boolean }) {
  return <TemplateApprovalVisual isActive={isActive} />;
}

function FollowUpStep1Visual({ isActive }: { isActive: boolean }) {
  return <TemplateApprovalVisual isActive={isActive} />;
}

function BroadcastStep2Visual({ isActive }: { isActive: boolean }) {
  const recipients = [
    { name: 'Sarah Connor', tag: 'Hot' as LeadTemperature, selected: true, labelWidth: 'w-24' },
    { name: 'John Connor', tag: 'Warm' as LeadTemperature, selected: true, labelWidth: 'w-16' },
    { name: 'T-800', tag: 'Cold' as LeadTemperature, selected: false, labelWidth: 'w-20' },
  ];

  const warmStyle = getLeadTemperatureStyle('Warm');
  const WarmIcon = warmStyle.icon;
  const hotStyle = getLeadTemperatureStyle('Hot');
  const HotIcon = hotStyle.icon;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className={cn(
        "flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1.5 transition-all duration-500 ease-out transform",
        isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}>
        <Search className="size-3.5 text-muted-foreground shrink-0" />
        <div className="flex flex-wrap gap-1.5">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-all shadow-none",
            warmStyle.bg,
            warmStyle.text
          )}>
            <WarmIcon className={cn("size-2.5 shrink-0", warmStyle.iconClass)} />
            <span>Warm</span>
          </span>
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-all shadow-none",
            hotStyle.bg,
            hotStyle.text
          )}>
            <HotIcon className={cn("size-2.5 shrink-0", hotStyle.iconClass)} />
            <span>Hot</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {recipients.map((r, i) => {
          const style = getLeadTemperatureStyle(r.tag);
          const TagIcon = style.icon;

          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 transition-all duration-500 ease-out transform",
                isActive
                  ? (r.selected ? "opacity-100 translate-y-0 scale-100" : "opacity-40 translate-y-0 scale-100")
                  : "opacity-0 translate-y-4 scale-95"
              )}
              style={{
                transitionDelay: isActive ? `${(i + 1) * 150}ms` : '0ms'
              }}
            >
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                  <User className="size-3.5" />
                </div>
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[11px] font-semibold text-foreground">{r.name}</p>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-medium leading-none shrink-0",
                      style.bg,
                      style.text
                    )}>
                      <TagIcon className={cn("size-2 shrink-0", style.iconClass)} />
                      <span>{r.tag}</span>
                    </span>
                  </div>
                  {/* Skeleton loading block representing hidden user detail/status */}
                  <div className={cn("h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mt-0.5", r.labelWidth)} />
                </div>
              </div>
              {r.selected ? (
                <div className="flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0">
                  <Check className="size-2.5 text-white" strokeWidth={4} />
                </div>
              ) : (
                <div className="flex size-4 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600 shrink-0">
                  <X className="size-2.5 text-zinc-400 dark:text-zinc-500" strokeWidth={3} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type RuleCardConfig = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const TRIGGER_RULES: RuleCardConfig[] = [
  {
    title: "24h Delay",
    description: "Wait 24 hours of inactivity",
    icon: Timer,
  },
  {
    title: "Warm Leads",
    description: "Follow up high intent only",
    icon: Zap,
  },
  {
    title: "followup_offer",
    description: "Meta template to send",
    icon: FileText,
  },
  {
    title: "Max 3 Texts",
    description: "Limit to 3 follow-up attempts",
    icon: Repeat,
  },
  {
    title: "Active Window",
    description: "Send during work hours only",
    icon: CalendarClock,
  },
  {
    title: "Auto Cancel",
    description: "Stop when customer replies",
    icon: Check,
  },
];

function RuleCard({
  title,
  description,
  icon: Icon,
}: RuleCardConfig) {
  return (
    <div
      className={cn(
        "relative w-[110px] h-[105px] rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col justify-between transition-all duration-300 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md select-none"
      )}
    >
      <div className="flex size-5 shrink-0 items-center justify-start text-zinc-500 dark:text-zinc-400">
        <Icon className="size-4" strokeWidth={2} />
      </div>

      <div className="flex flex-col gap-0.5 mt-auto">
        {title.includes('_') ? (
          <code className="text-[9px] font-mono bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-1 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-800/50 w-fit block truncate font-semibold leading-none mb-0.5">
            {title}
          </code>
        ) : (
          <h4 className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50 leading-snug tracking-tight">
            {title}
          </h4>
        )}
        <span className="text-[8px] text-muted-foreground leading-tight line-clamp-2">
          {description}
        </span>
      </div>
    </div>
  );
}

function FollowUpStep2Visual({ isActive }: { isActive: boolean }) {
  const firstCol = [TRIGGER_RULES[0], TRIGGER_RULES[1]];
  const secondCol = [TRIGGER_RULES[2], TRIGGER_RULES[3]];
  const thirdCol = [TRIGGER_RULES[4], TRIGGER_RULES[5]];
  const fourthCol = [TRIGGER_RULES[1], TRIGGER_RULES[4]];

  return (
    <div className="relative flex h-full w-full flex-row items-center justify-center gap-2 overflow-hidden [perspective:500px] select-none">
      <div
        className="flex flex-row items-center gap-3"
        style={{
          transform:
            "translateX(-35px) translateY(0px) translateZ(-40px) rotateX(16deg) rotateY(-12deg) rotateZ(12deg)",
        }}
      >
        <Marquee pauseOnHover={isActive} vertical className="[--duration:12s] h-full">
          {firstCol.map((rule, idx) => (
            <RuleCard key={`${rule.title}-${idx}`} {...rule} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover={isActive} className="[--duration:14s] h-full" vertical>
          {secondCol.map((rule, idx) => (
            <RuleCard key={`${rule.title}-${idx}`} {...rule} />
          ))}
        </Marquee>
        <Marquee pauseOnHover={isActive} className="[--duration:13s] h-full" vertical>
          {thirdCol.map((rule, idx) => (
            <RuleCard key={`${rule.title}-${idx}`} {...rule} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover={isActive} className="[--duration:15s] h-full" vertical>
          {fourthCol.map((rule, idx) => (
            <RuleCard key={`${rule.title}-${idx}`} {...rule} />
          ))}
        </Marquee>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-muted/60 dark:from-zinc-950/60 to-transparent z-20"></div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted/60 dark:from-zinc-950/60 to-transparent z-20"></div>
    </div>
  );
}

function BroadcastNotificationCard({ message, time }: { message: string; time: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all duration-300 hover:shadow-md">
      <Megaphone className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground truncate max-w-[80%]">
            {message}
          </span>
          <span className="text-[9px] text-muted-foreground shrink-0">{time}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {/* Skeleton loading blocks to represent hidden user data */}
          <div className="h-2.5 w-24 bg-muted/80 rounded animate-pulse" />
          <div className="h-2.5 w-12 bg-muted/40 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function BroadcastStep3Visual({ isActive }: { isActive: boolean }) {
  const notifications = [
    { id: 1, time: 'Just now', message: '📢 Promo: Enjoy 20% off this weekend only!' },
    { id: 2, time: '2m ago', message: '✨ New Arrival: Summer collection is now live!' },
    { id: 3, time: '10m ago', message: '🎁 Special Offer: Free shipping on your next order!' },
  ];

  if (!isActive) {
    return (
      <div className="flex w-full flex-col gap-2.5">
        {notifications.map((n) => (
          <BroadcastNotificationCard key={n.id} time={n.time} message={n.message} />
        ))}
      </div>
    );
  }

  return (
    <AnimatedList delay={800} className="w-full gap-2.5">
      {notifications.map((n) => (
        <AnimatedListItem key={n.id}>
          <BroadcastNotificationCard time={n.time} message={n.message} />
        </AnimatedListItem>
      ))}
    </AnimatedList>
  );
}

function FollowUpNotificationCard({ message, time }: { message: string; time: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted p-1.5">
        <img src="/icon.svg" className="size-full dark:invert" alt="Kilobot" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground truncate max-w-[80%]">
            {message}
          </span>
          <span className="text-[9px] text-muted-foreground shrink-0">{time}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {/* Skeleton loading blocks to represent hidden user data */}
          <div className="h-2.5 w-24 bg-muted/80 rounded animate-pulse" />
          <div className="h-2.5 w-12 bg-muted/40 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function FollowUpStep3Visual({ isActive }: { isActive: boolean }) {
  const notifications = [
    { id: 1, time: 'Just now', message: 'Are you still interested?' },
    { id: 2, time: '2m ago', message: 'We have a special offer for you!' },
    { id: 3, time: '10m ago', message: 'Just checking back on your request.' },
  ];

  if (!isActive) {
    return (
      <div className="flex w-full flex-col gap-2.5">
        {notifications.map((n) => (
          <FollowUpNotificationCard key={n.id} time={n.time} message={n.message} />
        ))}
      </div>
    );
  }

  return (
    <AnimatedList delay={800} className="w-full gap-2.5">
      {notifications.map((n) => (
        <AnimatedListItem key={n.id}>
          <FollowUpNotificationCard time={n.time} message={n.message} />
        </AnimatedListItem>
      ))}
    </AnimatedList>
  );
}

function ScenarioCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 px-3.5 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FeaturesVisual({
  variant,
  isActive,
  animKey,
}: {
  variant: WhatsAppOverviewVariant;
  isActive: boolean;
  animKey: number;
}) {
  const scenarios = getFeatureScenarios(variant);

  if (!isActive) {
    return (
      <div className="flex w-full flex-col gap-2">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.title}
            icon={scenario.icon}
            title={scenario.title}
            description={scenario.description}
          />
        ))}
      </div>
    );
  }

  return (
    <AnimatedList key={`${variant}-features-${animKey}`} delay={750} className="w-full gap-3">
      {scenarios.map((scenario) => (
        <AnimatedListItem key={scenario.title}>
          <ScenarioCard
            icon={scenario.icon}
            title={scenario.title}
            description={scenario.description}
          />
        </AnimatedListItem>
      ))}
    </AnimatedList>
  );
}
