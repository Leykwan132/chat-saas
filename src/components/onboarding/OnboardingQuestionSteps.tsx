import type { ComponentType } from 'react';
import { ArrowLeft, Check, CornerDownLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  channelOptions,
  roles,
  useCaseOptions,
} from './onboardingOptions';

const stepMotion = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.22 },
};

function StepHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StepActions({
  canContinue,
  showBack = true,
  onBack,
  onNext,
}: {
  canContinue: boolean;
  showBack?: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      {showBack ? (
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft />
          Back
        </Button>
      ) : (
        <span />
      )}
      <Button type="button" disabled={!canContinue} onClick={onNext}>
        Enter
        <CornerDownLeft />
      </Button>
    </div>
  );
}

export function RoleStep({
  role,
  onChange,
  onNext,
}: {
  role: string;
  onChange: (role: string) => void;
  onNext: () => void;
}) {
  return (
    <motion.div {...stepMotion} className="flex flex-col gap-8">
      <StepHeader
        title="What's your role?"
        description="We'll personalise your workspace defaults around this."
      />
      <div className="flex flex-col gap-2">
        {roles.map((option) => {
          const active = role === option.id;
          return (
            <Button
              key={option.id}
              type="button"
              variant={active ? 'default' : 'outline'}
              className="h-auto justify-between rounded-xl px-5 py-3.5 text-left"
              onClick={() => onChange(option.id)}
            >
              <span className="flex min-w-0 flex-col items-start">
                <span className="text-sm font-semibold">{option.label}</span>
                <span className={active ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                  {option.description}
                </span>
              </span>
              {active ? <Check className="shrink-0" /> : null}
            </Button>
          );
        })}
      </div>
      <StepActions
        showBack={false}
        canContinue={Boolean(role)}
        onBack={() => undefined}
        onNext={onNext}
      />
    </motion.div>
  );
}

function MultiSelectStep({
  title,
  description,
  options,
  selected,
  onToggle,
  onBack,
  onNext,
}: {
  title: string;
  description: string;
  options: Array<{
    id: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
  }>;
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div {...stepMotion} className="flex flex-col gap-8">
      <StepHeader title={title} description={description} />
      <div className="grid min-h-[13.5rem] grid-cols-2 grid-rows-3 gap-3 sm:gap-4">
        {options.map((option) => {
          const Icon = option.icon;
          const active = selected.includes(option.id);
          return (
            <Button
              key={option.id}
              type="button"
              variant={active ? 'default' : 'outline'}
              className="h-auto rounded-full text-base"
              onClick={() => onToggle(option.id)}
            >
              <Icon className="size-5" />
              {option.label}
            </Button>
          );
        })}
      </div>
      <StepActions
        canContinue={selected.length > 0}
        onBack={onBack}
        onNext={onNext}
      />
    </motion.div>
  );
}

export function UseCaseStep(props: {
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <MultiSelectStep
      title="Use cases?"
      description="Pick all that apply — we'll load the right templates."
      options={useCaseOptions}
      {...props}
    />
  );
}

export function ChannelsStep(props: {
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <MultiSelectStep
      title="Which channels?"
      description="Pick all that apply — you can always add more later."
      options={channelOptions}
      {...props}
    />
  );
}
