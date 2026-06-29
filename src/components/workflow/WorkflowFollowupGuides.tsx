import { useState, type ReactNode } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useParams } from 'react-router';
import {
  FollowUpOverviewDialog,
  OVERVIEW_VARIANT_META,
} from '@/components/WhatsAppFeatureOverviewDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../../shared/permissions';
import { WorkflowFollowupCostCalculatorDialog } from './WorkflowFollowupCostCalculatorDialog';
import type { WorkflowFollowupGuidesFlowNode } from './workflowTypes';

type BookCardProps = {
  tag: string;
  title: ReactNode;
  onClick?: () => void;
  isDark?: boolean;
};

function BookCard({ tag, title, onClick, isDark }: BookCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative h-[156px] w-[118px] cursor-pointer select-none [perspective:1000px]"
    >
      <div className="absolute inset-0 z-0 rounded-l-sm rounded-r-[14px] border border-neutral-200/80 bg-white shadow-inner transition-transform duration-500 ease-out group-hover:translate-x-1.5 dark:border-neutral-800/80 dark:bg-[#1a1a1a]" />
      <div
        style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
        className={`absolute inset-0 z-20 flex origin-left flex-col justify-between rounded-l-sm rounded-r-[14px] border py-3 pl-[22px] pr-3 shadow-md transition-transform duration-500 ease-out group-hover:[transform:rotateY(-24deg)] group-hover:shadow-lg ${
          isDark
            ? 'border-neutral-900 bg-neutral-950 text-white dark:bg-black'
            : 'border-neutral-200/80 bg-[#fafafa] text-neutral-800 dark:border-neutral-800/80 dark:bg-[#202020] dark:text-neutral-100'
        }`}
      >
        <div className="flex flex-col gap-2">
          <img
            src="/icon.svg"
            className={`size-4 shrink-0 ${isDark ? 'invert' : 'dark:invert'}`}
            alt="App Logo"
          />
          <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
            isDark
              ? 'border-neutral-800/50 bg-neutral-900 text-neutral-400'
              : 'border-neutral-200/30 bg-neutral-100 text-neutral-500 dark:border-neutral-700/30 dark:bg-neutral-800 dark:text-neutral-400'
          }`}
          >
            {tag}
          </span>
        </div>
        <h3 className={`text-[13px] font-semibold leading-tight tracking-tight ${
          isDark ? 'text-white' : 'text-neutral-800 dark:text-neutral-100'
        }`}
        >
          {title}
        </h3>
        <div className={`pointer-events-none absolute bottom-0 left-0 top-0 w-[15px] rounded-l-sm bg-gradient-to-r ${
          isDark
            ? 'from-white/[0.04] via-transparent to-black/[0.3]'
            : 'from-black/[0.08] via-transparent to-black/[0.12] dark:from-white/[0.03] dark:to-black/[0.2]'
        }`}
        />
        <div className={`pointer-events-none absolute bottom-0 left-[15px] top-0 w-px ${
          isDark ? 'bg-neutral-800/80' : 'bg-neutral-300/60 dark:bg-neutral-800/60'
        }`}
        />
        <div className={`pointer-events-none absolute bottom-0 left-[16px] top-0 w-px ${
          isDark ? 'bg-white/[0.02]' : 'bg-white/50 dark:bg-white/[0.02]'
        }`}
        />
      </div>
    </div>
  );
}

export function WorkflowFollowupGuidesNode(
  _props: NodeProps<WorkflowFollowupGuidesFlowNode>,
) {
  const { agentId } = useParams();
  const { can } = usePermissions();
  const canManage = can(Permission.FOLLOWUPS_MANAGE);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  return (
    <>
      <section className="nodrag nopan flex w-[380px] cursor-default flex-col gap-4 rounded-xl border border-dashed border-border/80 bg-muted p-5 text-card-foreground">
        <h2 className="m-0 truncate text-base font-semibold text-foreground">
          Guides
        </h2>
        <div className="flex items-end gap-5">
          <BookCard
            tag={OVERVIEW_VARIANT_META['follow-up'].tag}
            title={OVERVIEW_VARIANT_META['follow-up'].bookTitle}
            onClick={() => {
              setWalkthroughStep(0);
              setIsWalkthroughOpen(true);
            }}
          />
          <BookCard
            tag="Calculator"
            title="Cost Calculator"
            onClick={() => setIsCalculatorOpen(true)}
          />
        </div>
      </section>

      <FollowUpOverviewDialog
        open={isWalkthroughOpen}
        onOpenChange={setIsWalkthroughOpen}
        step={walkthroughStep}
        onStepChange={setWalkthroughStep}
        ctaHref={canManage ? `/dashboard/${agentId}/follow-ups/new` : undefined}
      />

      <WorkflowFollowupCostCalculatorDialog
        open={isCalculatorOpen}
        onOpenChange={setIsCalculatorOpen}
        agentId={agentId}
        canManage={canManage}
      />
    </>
  );
}
