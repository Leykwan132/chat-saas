import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkspaceSetupChecklistIntroDialog } from './WorkspaceSetupChecklistIntroDialog';
import { WorkspaceSetupChecklistPanel } from './WorkspaceSetupChecklistPanel';
import { WorkspaceSetupChecklistProgressRing } from './WorkspaceSetupChecklistProgressRing';
import {
  resolveWorkspaceSetupChecklistAction,
  type WorkspaceSetupChecklistStepKey,
} from './workspaceSetupChecklistNavigation';
import {
  workspaceSetupChecklistAccentBorderStyle,
  workspaceSetupChecklistPanelClassName,
  workspaceSetupChecklistRootClassName,
  workspaceSetupChecklistTriggerClassName,
} from './workspaceSetupChecklistLayout';
import { showWorkspaceSetupChecklistStepOpeningToast } from './workspaceSetupChecklistToasts';

type WorkspaceSetupChecklistProps = {
  agentId?: Id<'agents'>;
  className?: string;
};

export function WorkspaceSetupChecklist({
  agentId,
  className,
}: WorkspaceSetupChecklistProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceStarterGuide = searchParams.get('starterGuide') === '1';
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
  const [guideOpen, setGuideOpen] = useState(forceStarterGuide);
  const [introOpen, setIntroOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const introRecordedRef = useRef(false);

  useEffect(() => {
    if (forceStarterGuide) {
      setGuideOpen(true);
      return;
    }
    if (!checklist?.shouldShowIntro || introRecordedRef.current) return;
    introRecordedRef.current = true;
    setIntroOpen(true);
    void recordIntroShown({});
  }, [checklist?.shouldShowIntro, forceStarterGuide, recordIntroShown]);

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

  if (checklist === undefined || (!checklist.visible && !forceStarterGuide)) {
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
      className={cn(workspaceSetupChecklistRootClassName, className)}
    >
      {guideOpen ? (
        <div className={workspaceSetupChecklistPanelClassName}>
          <WorkspaceSetupChecklistPanel
            steps={checklist.steps}
            completing={completing}
            onStepClick={handleStepClick}
            onComplete={handleComplete}
            onClose={() => setGuideOpen(false)}
          />
        </div>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        aria-label={`Open Getting Started, ${checklist.completedCount} of ${checklist.totalCount} steps complete`}
        onClick={() => setGuideOpen(true)}
        style={workspaceSetupChecklistAccentBorderStyle}
        className={workspaceSetupChecklistTriggerClassName}
      >
        <span className="flex min-w-0 items-center truncate text-left leading-none">
          Getting Started
        </span>
        <span className="flex h-full shrink-0 items-center gap-1 overflow-visible tabular-nums text-[0.675rem] font-medium leading-none text-muted-foreground">
          <span className="leading-none">
            {checklist.completedCount}/{checklist.totalCount}
          </span>
          <WorkspaceSetupChecklistProgressRing
            completed={checklist.completedCount}
            total={checklist.totalCount}
          />
        </span>
      </Button>
      <WorkspaceSetupChecklistIntroDialog
        open={introOpen}
        onOpenChange={setIntroOpen}
        onCheckOut={handleCheckOut}
        onSkip={handleSkip}
      />
    </div>
  );
}
