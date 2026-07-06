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
import {
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
        aria-label="Open Launch Guide"
        onClick={() => setGuideOpen(true)}
        style={{
          background:
            'linear-gradient(var(--color-background), var(--color-background)) padding-box, linear-gradient(135deg, #34d399, #38bdf8, #a78bfa, #f472b6) border-box',
        }}
        className={workspaceSetupChecklistTriggerClassName}
      >
        <Rocket className="size-3.5" strokeWidth={1.8} />
        <span className="truncate">Launch Guide</span>
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
