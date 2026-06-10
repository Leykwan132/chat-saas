import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck,
  CalendarClock,
  Check,
  Clock3,
  Lightbulb,
  MessageCircle,
  Plus,
  SquareCheck,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { AnimatedList, AnimatedListItem } from '@/components/ui/animated-list';

export const AUTO_BOOKING_OVERVIEW_META = {
  tag: 'Auto Booking',
  bookTitle: 'Overview',
  dialogLabel: 'Overview',
} as const;

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
};

const FEATURE_SCENARIOS: FeatureScenario[] = [
  {
    icon: CalendarCheck,
    title: 'Consultation booking',
    description: 'Let customers book a call or meeting from chat.',
  },
  {
    icon: Clock3,
    title: 'Service appointment',
    description: 'Capture date, time, and contact details automatically.',
  },
  {
    icon: MessageCircle,
    title: 'Conversation-led booking',
    description: 'AI guides the customer through booking in natural chat.',
  },
];

const WORKFLOW_STEPS: WorkflowStepConfig[] = [
  {
    stepNumber: 1,
    icon: CalendarCheck,
    title: 'Set up services',
    description: 'Define what can be booked and what details the AI should collect.',
    points: [
      'Name each service and set duration plus buffer time',
      'Choose required fields like date, time, name, and phone',
      'Add custom fields when you need extra booking details',
    ],
  },
  {
    stepNumber: 2,
    icon: Users,
    title: 'Availability & assignment',
    description: 'Control who can be booked and how appointments are assigned.',
    points: [
      'Use team schedules to determine open slots',
      'Offer available slots or let customers suggest a time',
      'Assign to the conversation owner, round robin, or a specific user',
    ],
    note: 'Make sure team members have schedules configured so Auto Booking can find real availability.',
  },
  {
    stepNumber: 3,
    icon: UserCheck,
    title: 'Kilobot handles it',
    description: 'Your agent books appointments directly inside customer conversations.',
    points: [
      'AI collects booking details in chat',
      'Checks live availability before confirming',
      'Creates calendar events once the customer approves a slot',
    ],
  },
];

const OVERVIEW_SLIDE_HEIGHT_CLASS =
  'h-[min(440px,calc(90vh-5.5rem))] min-h-[400px]';

function workflowToOverviewStep(step: WorkflowStepConfig): OverviewStep {
  return {
    title: `${step.stepNumber}. ${step.title}`,
    description: step.description,
    sectionTitle: step.stepNumber === 3 ? 'Kilobot enables' : 'Key checklist',
    points: step.points,
    visual: 'workflowStep',
    note: step.note,
    stepNumber: step.stepNumber,
  };
}

const OVERVIEW_STEPS: OverviewStep[] = [
  {
    title: 'Auto Booking',
    description:
      'Let AI book appointments for customers right from chat, without manual back-and-forth.',
    sectionTitle: 'Most common scenarios',
    points: [],
    visual: 'features',
  },
  ...WORKFLOW_STEPS.map(workflowToOverviewStep),
];

interface AutoBookingOverviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: number;
  onStepChange: (step: number) => void;
  onAddService?: () => void;
}

export function AutoBookingOverviewDialog({
  open,
  onOpenChange,
  step,
  onStepChange,
  onAddService,
}: AutoBookingOverviewDialogProps) {
  const stepCount = OVERVIEW_STEPS.length;
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
        <DialogTitle className="sr-only">{AUTO_BOOKING_OVERVIEW_META.dialogLabel}</DialogTitle>
        <Carousel setApi={setApi} opts={{ startIndex: step, watchDrag: true }} className="w-full">
          <CarouselContent className={cn('ml-0', OVERVIEW_SLIDE_HEIGHT_CLASS)}>
            {OVERVIEW_STEPS.map((slide, slideIndex) => (
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
                          ? FEATURE_SCENARIOS.map((scenario) => (
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
                              const ChecklistIcon =
                                slide.stepNumber === 3 ? Check : SquareCheck;
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
                      <div className="mt-1 flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/40 p-3">
                        <AlertCircle
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          strokeWidth={2}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                            Note
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {slide.note}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      'relative h-[min(240px,38vh)] shrink-0 overflow-hidden border-t border-border/40 bg-muted/15 md:h-full md:border-l md:border-t-0',
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
                        '[mask-image:radial-gradient(400px_circle_at_center,transparent,white)]',
                        'text-zinc-400/40 dark:text-white/15',
                      )}
                    />
                    <div className="relative z-10 flex size-full items-center justify-center p-6 md:p-8">
                      <div className="w-full max-w-[280px]">
                        <SlideVisual
                          visual={slide.visual}
                          isActive={open && activeIndex === slideIndex}
                          animKey={featuresAnimKey}
                          stepNumber={slide.stepNumber}
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
              {OVERVIEW_STEPS.map((_, i) => (
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  Maybe later
                </button>
                {onAddService ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 font-semibold"
                    onClick={() => {
                      onAddService();
                      onOpenChange(false);
                    }}
                  >
                    <Plus className="size-3.5" />
                    Add a service
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

function SlideVisual({
  visual,
  isActive,
  animKey,
  stepNumber,
}: {
  visual: OverviewVisual;
  isActive: boolean;
  animKey: number;
  stepNumber?: number;
}) {
  if (visual === 'features') {
    return <FeaturesVisual isActive={isActive} animKey={animKey} />;
  }
  if (visual === 'workflowStep' && stepNumber === 1) {
    return <ServiceSetupVisual isActive={isActive} />;
  }
  if (visual === 'workflowStep' && stepNumber === 2) {
    return <AvailabilityVisual isActive={isActive} />;
  }
  if (visual === 'workflowStep' && stepNumber === 3) {
    return <BookingChatVisual isActive={isActive} />;
  }
  return null;
}

function ScenarioCard({
  icon: Icon,
  title,
  description,
}: FeatureScenario) {
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
  isActive,
  animKey,
}: {
  isActive: boolean;
  animKey: number;
}) {
  if (!isActive) {
    return (
      <div className="flex w-full flex-col gap-2">
        {FEATURE_SCENARIOS.map((scenario) => (
          <ScenarioCard key={scenario.title} {...scenario} />
        ))}
      </div>
    );
  }

  return (
    <AnimatedList key={`auto-booking-features-${animKey}`} delay={750} className="w-full gap-3">
      {FEATURE_SCENARIOS.map((scenario) => (
        <AnimatedListItem key={scenario.title}>
          <ScenarioCard {...scenario} />
        </AnimatedListItem>
      ))}
    </AnimatedList>
  );
}

function ServiceSetupVisual({ isActive }: { isActive: boolean }) {
  const fields = [
    { label: 'Service name', value: 'Consultation' },
    { label: 'Duration', value: '30 min' },
    { label: 'Required fields', value: 'Date, time, phone' },
  ];

  return (
    <div className="flex w-full flex-col gap-2.5">
      {fields.map((field, i) => (
        <div
          key={field.label}
          className={cn(
            'rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all duration-500 ease-out',
            isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          )}
          style={{ transitionDelay: isActive ? `${i * 150}ms` : '0ms' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {field.label}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{field.value}</p>
        </div>
      ))}
    </div>
  );
}

function AvailabilityVisual({ isActive }: { isActive: boolean }) {
  const slots = [
    { time: 'Mon 10:00 AM', user: 'Alex' },
    { time: 'Mon 2:30 PM', user: 'Jamie' },
    { time: 'Tue 11:00 AM', user: 'Alex' },
  ];

  return (
    <div className="flex w-full flex-col gap-2.5">
      {slots.map((slot, i) => (
        <div
          key={slot.time}
          className={cn(
            'flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all duration-500 ease-out',
            isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          )}
          style={{ transitionDelay: isActive ? `${i * 150}ms` : '0ms' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CalendarClock className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{slot.time}</p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {slot.user}
          </span>
        </div>
      ))}
    </div>
  );
}

function BookingChatVisual({ isActive }: { isActive: boolean }) {
  const messages = [
    { role: 'customer', text: 'Can I book a consultation this week?' },
    { role: 'agent', text: 'Sure. I have Mon 10:00 AM or Tue 11:00 AM available.' },
    { role: 'customer', text: 'Monday works for me.' },
    { role: 'agent', text: 'Booked. You are confirmed for Mon 10:00 AM.' },
  ];

  return (
    <div className="flex w-full flex-col gap-2">
      {messages.map((message, i) => (
        <div
          key={message.text}
          className={cn(
            'max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm transition-all duration-500 ease-out',
            message.role === 'customer'
              ? 'self-start border border-border/70 bg-card text-foreground'
              : 'self-end border border-emerald-500/20 bg-emerald-500/10 text-foreground',
            isActive ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
          )}
          style={{ transitionDelay: isActive ? `${i * 180}ms` : '0ms' }}
        >
          {message.text}
        </div>
      ))}
    </div>
  );
}
