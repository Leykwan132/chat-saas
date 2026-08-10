import {
  Bot,
  BookOpen,
  MessageCircle,
  Plug,
  ShoppingCart,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { WorkspaceSetupChecklistStepKey } from './workspaceSetupChecklistNavigation';

type WorkspaceSetupChecklistHoverIllustrationProps = {
  stepKey: WorkspaceSetupChecklistStepKey;
};

const iconByStep = {
  createAgent: Bot,
  uploadKnowledgeBase: BookOpen,
  testAgent: MessageCircle,
  createWorkflow: Workflow,
  createService: ShoppingCart,
  connectChannel: Plug,
} satisfies Record<WorkspaceSetupChecklistStepKey, LucideIcon>;

function TripleIconGroup({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex h-[10.4rem] items-center justify-center overflow-hidden rounded-lg bg-muted/45">
      <div className="flex items-center justify-center gap-2.5">
        <Icon className="size-[18px] text-muted-foreground/30" strokeWidth={1.8} />
        <Icon className="size-[18px] text-muted-foreground/55" strokeWidth={1.8} />
        <Icon className="size-[18px] text-muted-foreground" strokeWidth={1.8} />
      </div>
    </div>
  );
}

export function WorkspaceSetupChecklistHoverIllustration({
  stepKey,
}: WorkspaceSetupChecklistHoverIllustrationProps) {
  const Icon = iconByStep[stepKey];

  return <TripleIconGroup icon={Icon} />;
}
