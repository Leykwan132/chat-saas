import { BookOpen, Gamepad2, RadioTower } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { TypingAnimation } from '@/components/ui/typing-animation';

type CreateAgentSuccessStateProps = {
  onTrain: () => void;
  onPlayground: () => void;
  onDeploy: () => void;
};

export function CreateAgentSuccessState({
  onTrain,
  onPlayground,
  onDeploy,
}: CreateAgentSuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="flex w-full max-w-2xl flex-col items-center gap-6 text-center"
    >
      <TypingAnimation
        as="h1"
        startOnView={false}
        showCursor={false}
        typeSpeed={45}
        className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl"
      >
        Your agent is ready.
      </TypingAnimation>

      <p className="text-muted-foreground">Choose what you want to do next.</p>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Button type="button" onClick={onTrain}>
          <BookOpen data-icon="inline-start" />
          Train your agent
        </Button>
        <Button type="button" variant="outline" onClick={onPlayground}>
          <Gamepad2 data-icon="inline-start" />
          Try in Playground
        </Button>
        <Button type="button" variant="outline" onClick={onDeploy}>
          <RadioTower data-icon="inline-start" />
          Deploy to a channel
        </Button>
      </div>
    </motion.div>
  );
}
