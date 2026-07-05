import { BookOpenText, Bot, Rocket, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type WorkspaceSetupChecklistIntroDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckOut: () => void;
  onSkip: () => void;
};

const introFeatures = [
  {
    Icon: Bot,
    title: 'Create your agent',
    description: 'Build the assistant customers meet.',
  },
  {
    Icon: BookOpenText,
    title: 'Add knowledge',
    description: 'Add docs, answers, and policies.',
  },
  {
    Icon: Rocket,
    title: 'Go live',
    description: 'Test, automate, and connect a channel.',
  },
] satisfies {
  Icon: LucideIcon;
  title: string;
  description: string;
}[];

function IntroFeatureList() {
  return (
    <div className="flex flex-col gap-4">
      {introFeatures.map(({ Icon, title, description }) => (
        <div key={title} className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="m-0 text-sm font-medium">{title}</p>
            <p className="m-0 text-sm leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function GradientPanel() {
  return (
    <div className="hidden min-h-full overflow-hidden rounded-r-lg sm:block">
      <img
        src="https://storage.kilobot.app/welcome-1.png"
        alt=""
        aria-hidden="true"
        className="h-full min-h-[27.25rem] w-full object-cover"
      />
    </div>
  );
}

export function WorkspaceSetupChecklistIntroDialog({
  open,
  onOpenChange,
  onCheckOut,
  onSkip,
}: WorkspaceSetupChecklistIntroDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden rounded-lg p-0 sm:max-w-[46.25rem]"
      >
        <div className="grid sm:grid-cols-2">
          <div className="flex flex-col justify-between gap-6 p-6 sm:min-h-[27.25rem] sm:p-7">
            <div className="flex flex-col gap-7">
              <DialogHeader>
                <DialogTitle className="text-xl">Welcome to Kilobot</DialogTitle>
                <DialogDescription>
                  Set up your first AI agent in minutes.
                </DialogDescription>
              </DialogHeader>
              <IntroFeatureList />
            </div>
            <DialogFooter className="sm:justify-start">
              <Button type="button" className="h-11 px-5" onClick={onCheckOut}>
                Show Guide
              </Button>
              <Button type="button" variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            </DialogFooter>
          </div>
          <GradientPanel />
        </div>
      </DialogContent>
    </Dialog>
  );
}
