import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Rocket } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkspaceSetupChecklistIntroDialog } from './WorkspaceSetupChecklistIntroDialog';
import { WorkspaceSetupChecklistPanel } from './WorkspaceSetupChecklistPanel';
import {
  resolveWorkspaceSetupChecklistAction,
  type WorkspaceSetupChecklistStepKey,
} from './workspaceSetupChecklistNavigation';
import { showWorkspaceSetupChecklistStepOpeningToast } from './workspaceSetupChecklistToasts';

type WorkspaceSetupChecklistProps = {
  agentId?: Id<'agents'>;
  className?: string;
};

function LaunchGuideIconImage() {
  return (
    <span className="flex h-[8.45rem] w-full items-center justify-center overflow-hidden rounded-md bg-muted/45">
      <span className="flex items-center justify-center gap-2.5">
        <Rocket className="size-[18px] text-muted-foreground/30" strokeWidth={1.8} />
        <Rocket className="size-[18px] text-muted-foreground/55" strokeWidth={1.8} />
        <Rocket className="size-[18px] text-muted-foreground" strokeWidth={1.8} />
      </span>
    </span>
  );
}

export function WorkspaceSetupChecklist({
  agentId,
  className,
}: WorkspaceSetupChecklistProps) {
  const navigate = useNavigate();
  const checklist = useQuery(
    api.workspaceSetupChecklist.getWorkspaceSetupChecklist,
    agentId ? { agentId } : {},
  );
  const recordIntroShown = useMutation(
    api.workspaceSetupChecklist.recordWorkspaceSetupChecklistIntroShown,
  );
  const completeChecklist = useMutation(
    api.workspaceSetupChecklist.completeWorkspaceSetupChecklist,
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const introRecordedRef = useRef(false);

  useEffect(() => {
    if (!checklist?.shouldShowIntro || introRecordedRef.current) return;
    introRecordedRef.current = true;
    setIntroOpen(true);
    void recordIntroShown({});
  }, [checklist?.shouldShowIntro, recordIntroShown]);

  useEffect(() => {
    if (!guideOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current?.contains(target)) return;
      setGuideOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [guideOpen]);

  if (checklist === undefined || !checklist.visible) {
    return null;
  }

  const handleStepClick = (stepKey: WorkspaceSetupChecklistStepKey) => {
    const action = resolveWorkspaceSetupChecklistAction({
      stepKey,
      agents: checklist.agents,
      selectedAgentId: checklist.selectedAgentId ?? agentId,
    });

    if (action.kind === 'toast') {
      const toastId = toast.loading('Checking setup...');
      toast.info(action.message, { id: toastId });
      return;
    }

    showWorkspaceSetupChecklistStepOpeningToast();
    setGuideOpen(false);
    navigate(action.to);
  };

  const handleComplete = async () => {
    setCompleting(true);
    const toastId = toast.loading('Completing checklist...');
    try {
      await completeChecklist({});
      toast.success('Tutorial has been completed', { id: toastId });
      setGuideOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not complete checklist', {
        id: toastId,
      });
    } finally {
      setCompleting(false);
    }
  };

  const handleCheckOut = () => {
    setIntroOpen(false);
    setGuideOpen(true);
  };

  const handleSkip = () => {
    setIntroOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        'fixed right-4 bottom-4 z-50 transition-[width] duration-200 sm:right-5 sm:bottom-5',
        guideOpen
          ? 'w-[min(20rem,calc(100vw-2rem))] sm:w-80'
          : 'w-[min(11.5rem,calc(100vw-2rem))] sm:w-44',
        className,
      )}
    >
      {guideOpen ? (
        <WorkspaceSetupChecklistPanel
          steps={checklist.steps}
          completing={completing}
          onStepClick={handleStepClick}
          onComplete={handleComplete}
          onClose={() => setGuideOpen(false)}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          aria-label="Open Launch Guide"
          onClick={() => setGuideOpen(true)}
          style={{
            background:
              'linear-gradient(var(--color-background), var(--color-background)) padding-box, linear-gradient(135deg, #34d399, #38bdf8, #a78bfa, #f472b6) border-box',
          }}
          className="h-auto w-full flex-col items-stretch justify-start gap-2 rounded-lg border border-transparent p-2 text-left text-foreground shadow-lg shadow-black/5 backdrop-blur"
        >
          <LaunchGuideIconImage />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-xs font-medium">Launch Guide</span>
            <span className="truncate text-[11px] leading-4 text-muted-foreground">
              Follow the key setup steps.
            </span>
          </span>
        </Button>
      )}
      <WorkspaceSetupChecklistIntroDialog
        open={introOpen}
        onOpenChange={setIntroOpen}
        onCheckOut={handleCheckOut}
        onSkip={handleSkip}
      />
    </div>
  );
}
