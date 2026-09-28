import type { Id } from "../../../convex/_generated/dataModel";
import type { WorkflowNodeKind } from "../../../shared/workflows";
import { WorkflowBookingNodeServices } from "./WorkflowBookingNodeServices";
import { WorkflowNodeConditionControl } from "./WorkflowNodeConditionControl";
import { WorkflowNodeEscalationMessageControl } from "./WorkflowNodeEscalationMessageControl";
import { WorkflowNodeMessageControl } from "./WorkflowNodeMessageControl";
import { WorkflowSendMediaSection } from "./WorkflowSendMediaSection";

type WorkflowNodeDirectControlsProps = {
  agentId: Id<"agents">;
  nodeId: Id<"workflowNodes">;
  kind: WorkflowNodeKind;
  description?: string;
  escalationMessageEnabled?: boolean;
  escalationMessage?: string;
  incomingCondition?: {
    edgeId: Id<"workflowEdges">;
    detail?: string;
  };
  allowedServiceIds?: Id<"appointmentServices">[];
  disabled: boolean;
};

export function WorkflowNodeDirectControls({
  agentId,
  nodeId,
  kind,
  description,
  escalationMessageEnabled,
  escalationMessage,
  incomingCondition,
  allowedServiceIds,
  disabled,
}: WorkflowNodeDirectControlsProps) {
  if (kind === "sendText") {
    return (
      <WorkflowNodeMessageControl
        agentId={agentId}
        nodeId={nodeId}
        description={description}
        disabled={disabled}
      />
    );
  }
  if (kind === "sendImage" || kind === "sendFile") {
    return (
      <div className="nodrag nopan mt-3 w-full border-t border-border pt-3">
        <WorkflowSendMediaSection
          agentId={agentId}
          nodeId={nodeId}
          nodeKind={kind}
          presentation="node"
        />
      </div>
    );
  }
  if (kind === "bookAppointment") {
    return (
      <WorkflowBookingNodeServices
        agentId={agentId}
        nodeId={nodeId}
        allowedServiceIds={allowedServiceIds}
        disabled={disabled}
      />
    );
  }
  if (kind === "humanEscalation") {
    return (
      <>
        {incomingCondition !== undefined ? (
          <WorkflowNodeConditionControl
            agentId={agentId}
            nodeId={nodeId}
            conditionDetail={incomingCondition.detail}
            disabled={disabled}
          />
        ) : null}
        <WorkflowNodeEscalationMessageControl
          agentId={agentId}
          nodeId={nodeId}
          enabled={escalationMessageEnabled}
          message={escalationMessage}
          disabled={disabled}
        />
      </>
    );
  }
  if (kind === "closeConversation") {
    return (
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Closes the conversation.
      </p>
    );
  }
  return null;
}
