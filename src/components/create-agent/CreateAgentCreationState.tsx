import { AlertCircle, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { TypingAnimation } from '@/components/ui/typing-animation';
import { cn } from '@/lib/utils';

const CREATING_AGENT_PHRASES = [
  'Cooking your agent…',
  'Preparing your agent…',
  'Building your agent…',
  'Polishing your agent…',
  'Crafting your agent…',
];

const PROGRESS_ITEMS = [
  { label: 'Creating agent', phase: 1 },
  { label: 'Adding business context', phase: 2 },
  { label: 'Applying agent goal', phase: 3 },
  { label: 'Agent ready', phase: 3 },
];

type CreateAgentCreationStateProps = {
  name: string;
  phase: number;
  error: string | null;
};

export function CreateAgentCreationState({
  name,
  phase,
  error,
}: CreateAgentCreationStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-10 text-center"
    >
      <div className="flex flex-col gap-3">
        <TypingAnimation
          words={CREATING_AGENT_PHRASES}
          loop
          as="h1"
          startOnView={false}
          showCursor={false}
          typeSpeed={45}
          deleteSpeed={28}
          pauseDelay={1800}
          className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl"
        />
        <p className="text-base text-muted-foreground sm:text-lg">
          Setting up {name.trim()} — this only takes a moment.
        </p>
      </div>

      <ul className="flex w-fit flex-col gap-4">
        {PROGRESS_ITEMS.map((item) => {
          const done = phase >= item.phase;
          return (
            <li key={item.label} className="flex items-center gap-4 text-left">
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border',
                  done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground',
                )}
              >
                {done ? <Check /> : <Spinner />}
              </span>
              <span className={done ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </motion.div>
  );
}
