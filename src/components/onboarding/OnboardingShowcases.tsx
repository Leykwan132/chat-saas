import { forwardRef, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Gift, Globe, User } from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import {
  AnimatedSpan,
  Terminal as TerminalWindow,
  TypingAnimation,
} from '@/components/ui/terminal';
import { cn } from '@/lib/utils';
import { channelOptions, type OnboardingStep, useCaseOptions } from './onboardingOptions';

function RoleSetupTerminal({ role }: { role: string }) {
  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot setup</TypingAnimation>
      <AnimatedSpan className="text-primary">✔ Account connected</AnimatedSpan>
      <AnimatedSpan className="text-primary">✔ AI agents ready</AnimatedSpan>
      <AnimatedSpan className="text-primary">✔ Channels prepared</AnimatedSpan>
      <AnimatedSpan className="text-primary">✔ Knowledge base connected</AnimatedSpan>
      <AnimatedSpan className="text-muted-foreground">
        ℹ 500 free credits added
      </AnimatedSpan>
      <AnimatedSpan className={role ? 'text-primary' : 'text-muted-foreground'}>
        {role ? `✔ Role set: ${role}` : '⏳ Pick your role on the left'}
      </AnimatedSpan>
      <TypingAnimation className="text-muted-foreground">
        {role
          ? 'Setup complete. Hit next when you are ready.'
          : 'Choose the role that best matches what you do.'}
      </TypingAnimation>
    </TerminalWindow>
  );
}

function UseCaseShowcase() {
  return (
    <div className="flex w-full flex-col gap-3">
      {useCaseOptions.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.figure
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="mx-auto flex w-full max-w-[400px] items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
              <Icon className="size-[18px]" />
            </div>
            <figcaption className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.label}</p>
              <p className="truncate text-sm text-muted-foreground">
                {item.description}
              </p>
            </figcaption>
          </motion.figure>
        );
      })}
    </div>
  );
}

const BeamCircle = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; selected?: boolean; className?: string }
>(({ children, selected, className }, ref) => (
  <div
    ref={ref}
    className={cn(
      'z-10 flex size-14 items-center justify-center rounded-full border-2 bg-background p-3 shadow-sm transition-all',
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
      className,
    )}
  >
    {children}
  </div>
));
BeamCircle.displayName = 'BeamCircle';

function ChannelBeamShowcase({ selected }: { selected: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const kilobotRef = useRef<HTMLDivElement>(null);
  const whatsappRef = useRef<HTMLDivElement>(null);
  const instagramRef = useRef<HTMLDivElement>(null);
  const messengerRef = useRef<HTMLDivElement>(null);
  const webRef = useRef<HTMLDivElement>(null);
  const isSelected = (id: string) => selected.includes(id);
  const opacity = (id: string) =>
    selected.length === 0 || isSelected(id) ? 0.2 : 0.08;

  return (
    <div ref={containerRef} className="relative flex h-[500px] items-center justify-center">
      <div className="flex w-full max-w-lg items-center justify-between gap-10">
        <BeamCircle ref={userRef}>
          <User className="size-6" />
        </BeamCircle>
        <BeamCircle ref={kilobotRef} className="size-16">
          <img src="/icon.svg" alt="Kilobot" className="size-full" />
        </BeamCircle>
        <div className="flex flex-col gap-3">
          <BeamCircle ref={whatsappRef} selected={isSelected(channelOptions[0].id)}>
            <SiWhatsapp className="size-7" />
          </BeamCircle>
          <BeamCircle ref={instagramRef} selected={isSelected(channelOptions[1].id)}>
            <SiInstagram className="size-7" />
          </BeamCircle>
          <BeamCircle ref={messengerRef} selected={isSelected(channelOptions[2].id)}>
            <SiMessenger className="size-7" />
          </BeamCircle>
          <BeamCircle ref={webRef} selected={isSelected(channelOptions[3].id)}>
            <Globe className="size-7" />
          </BeamCircle>
        </div>
      </div>
      <AnimatedBeam containerRef={containerRef} fromRef={userRef} toRef={kilobotRef} duration={3} />
      <AnimatedBeam containerRef={containerRef} fromRef={kilobotRef} toRef={whatsappRef} duration={3} pathOpacity={opacity(channelOptions[0].id)} />
      <AnimatedBeam containerRef={containerRef} fromRef={kilobotRef} toRef={instagramRef} duration={3} pathOpacity={opacity(channelOptions[1].id)} />
      <AnimatedBeam containerRef={containerRef} fromRef={kilobotRef} toRef={messengerRef} duration={3} pathOpacity={opacity(channelOptions[2].id)} />
      <AnimatedBeam containerRef={containerRef} fromRef={kilobotRef} toRef={webRef} duration={3} pathOpacity={opacity(channelOptions[3].id)} />
    </div>
  );
}

function ReferralShowcase() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-5 rounded-4xl border bg-card p-8 text-center shadow-sm">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Gift className="size-7" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Free credits for both of you</h2>
        <p className="text-sm text-muted-foreground">
          Apply a valid code now. The reward is added only when onboarding
          completes successfully.
        </p>
      </div>
    </div>
  );
}

export function OnboardingShowcase({
  step,
  role,
  channels,
}: {
  step: OnboardingStep;
  role: string;
  channels: string[];
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
        className="w-full"
      >
        {step === 1 ? <RoleSetupTerminal role={role} /> : null}
        {step === 2 ? <UseCaseShowcase /> : null}
        {step === 3 ? <ChannelBeamShowcase selected={channels} /> : null}
        {step === 4 ? <ReferralShowcase /> : null}
      </motion.div>
    </AnimatePresence>
  );
}
