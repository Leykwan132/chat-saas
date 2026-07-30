import {
  Bot,
  BarChart3,
  Coins,
  FileText,
  MessagesSquare,
  Sparkles,
  Trash2,
  Unplug,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

const lostFeatures = [
  {
    Icon: Sparkles,
    title: 'Advanced AI models',
    description: 'Only the basic Free model will remain.',
  },
  {
    Icon: Coins,
    title: 'Monthly credits',
    description: 'Your allowance will reset to 50 credits per month.',
  },
  {
    Icon: Bot,
    title: 'AI agents',
    description: 'You can use only one AI agent on Free.',
  },
  {
    Icon: Unplug,
    title: 'Connected channels',
    description: 'Free supports one connected channel.',
  },
  {
    Icon: BarChart3,
    title: 'Team and analytics features',
    description: 'Paid collaboration and analytics tools will be unavailable.',
  },
  {
    Icon: FileText,
    title: 'Knowledge storage',
    description: 'Each agent will be limited to 400 KB.',
  },
] as const;

const removedData = [
  {
    Icon: MessagesSquare,
    title: 'Chats and messages',
    description: 'All conversations in every non-Personal workspace.',
  },
  {
    Icon: Users,
    title: 'Contacts',
    description: 'All customer and contact records in those workspaces.',
  },
  {
    Icon: Bot,
    title: 'AI agents and threads',
    description: 'All agents and their saved thread data.',
  },
  {
    Icon: Unplug,
    title: 'Connected channels',
    description: 'All channel connections will be disconnected immediately.',
  },
  {
    Icon: Workflow,
    title: 'Workflows and automations',
    description: 'All workspace workflows and automation data.',
  },
  {
    Icon: Trash2,
    title: 'Everything else',
    description: 'All remaining non-Personal workspace data will be permanently deleted.',
  },
] as const;

type FreePlanDowngradeWarningDialogProps = {
  open: boolean;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onGoBack: () => void;
  onContinue: () => void;
};

type FreePlanDowngradeWarningContentProps = Pick<
  FreePlanDowngradeWarningDialogProps,
  'loading' | 'onGoBack' | 'onContinue'
>;

export function FreePlanDowngradeWarningDialog({
  open,
  loading,
  onOpenChange,
  onGoBack,
  onContinue,
}: FreePlanDowngradeWarningDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!loading) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-6 overflow-y-auto p-7 sm:max-w-2xl">
        <FreePlanDowngradeWarningContent
          loading={loading}
          onGoBack={onGoBack}
          onContinue={onContinue}
        />
      </DialogContent>
    </Dialog>
  );
}

export function FreePlanDowngradeWarningContent({
  loading,
  onGoBack,
  onContinue,
}: FreePlanDowngradeWarningContentProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Are you sure you want to downgrade?</DialogTitle>
        <DialogDescription>
          Free keeps only your Personal workspace. Everything in your other
          workspaces will be permanently deleted.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-y-6 md:grid-cols-2 md:gap-x-10">
        <DowngradeImpactList title="What you’ll lose" items={lostFeatures} />
        <DowngradeImpactList
          title="What will be removed"
          items={removedData}
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={loading}
          onClick={onGoBack}
        >
          Go back
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="bg-destructive text-white hover:bg-destructive/90 hover:text-white dark:bg-destructive dark:text-white dark:hover:bg-destructive/90 dark:hover:text-white"
          disabled={loading}
          onClick={onContinue}
        >
          {loading ? <Spinner /> : null}
          Continue anyway
        </Button>
      </DialogFooter>
    </>
  );
}

function DowngradeImpactList({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<{
    Icon: LucideIcon;
    title: string;
    description: string;
  }>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-heading text-sm font-medium">{title}</h3>
      <div className="flex flex-col gap-4">
        {items.map(({ Icon, title: itemTitle, description }) => (
          <div key={itemTitle} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{itemTitle}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
