import type { WorkflowNodeKind } from '../../../shared/workflows';
import { isWorkflowActionNodeKind } from '../../../shared/workflows';

export function getWorkflowInspectorBehavior(
  kind: WorkflowNodeKind,
  hasPersistedDescription: boolean,
) {
  const isSendTextAction = kind === 'sendText';
  const isSendMediaAction = kind === 'sendImage';
  const isSendFileAction = kind === 'sendFile';
  const hasMediaSection = isSendMediaAction || isSendFileAction;
  const isAction = isWorkflowActionNodeKind(kind);
  const hasGoalField = !hasMediaSection && (isAction || hasPersistedDescription);

  return {
    isAction,
    isSendTextAction,
    isSendMediaAction,
    isSendFileAction,
    hasMediaSection,
    hasGoalField,
    saveRequiresDescription: isAction && !hasMediaSection,
    nameLabel: isAction ? 'Name' : 'Title',
    goalLabel: isSendTextAction ? 'Message' : isAction ? 'Goal' : 'Description',
    mediaActionTitle: isSendFileAction ? 'Files to send' : 'Your Photos/Videos',
  };
}
