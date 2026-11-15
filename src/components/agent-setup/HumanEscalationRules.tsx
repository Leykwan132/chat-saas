import type { Id } from '../../../convex/_generated/dataModel';
import type { WorkflowGraph } from '@/components/workflow/workflowTypes';
import { WorkflowNodeEscalationKeywordsControl } from '@/components/workflow/WorkflowNodeEscalationKeywordsControl';
import { WorkflowNodeEscalationMessageControl } from '@/components/workflow/WorkflowNodeEscalationMessageControl';
import { HumanEscalationCondition } from './HumanEscalationCondition';
import { AutoDeescalationSettings } from './AutoDeescalationControl';
import { Separator } from '@/components/ui/separator';

type Props = {
  agentId: Id<'agents'>;
  graph: Pick<WorkflowGraph, 'nodes' | 'edges'>;
  disabled: boolean;
};

export function HumanEscalationRules({ agentId, graph, disabled }: Props) {
  const rules = graph.nodes.filter((node) => node.kind === 'humanEscalation');
  return (
    <div className="flex flex-col gap-6">
      {rules.map((node) => (
        <section key={node._id} className="flex flex-col gap-6">
          {graph.edges.filter((edge) => edge.targetNodeId === node._id).map((edge) => <HumanEscalationCondition key={`${edge._id}-${edge.updatedAt}`} agentId={agentId} edge={edge} disabled={disabled} />)}
          <WorkflowNodeEscalationKeywordsControl agentId={agentId} nodeId={node._id} enabled={node.escalationKeywordsEnabled} keywords={node.escalationKeywords} disabled={disabled} presentation="inspector" />
          <WorkflowNodeEscalationMessageControl agentId={agentId} nodeId={node._id} enabled={node.escalationMessageEnabled} mode={node.escalationMessageMode} message={node.escalationMessage} disabled={disabled} presentation="inspector" />
          <Separator />
        </section>
      ))}
      <AutoDeescalationSettings agentId={agentId} />
    </div>
  );
}
