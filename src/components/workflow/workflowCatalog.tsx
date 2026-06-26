import {
  Bot,
  CalendarCheck,
  CircleX,
  GitFork,
  Image as ImageIcon,
  ListChecks,
  MessageCircle,
  MessageSquare,
  MousePointerClick,
  PhoneForwarded,
  Pencil,
  Quote,
  Scissors,
  Wrench,
} from 'lucide-react';
import {
  ADDABLE_WORKFLOW_NODE_KINDS,
  WORKFLOW_NODE_META,
  type AddableWorkflowNodeKind,
  type WorkflowNodeKind,
} from '../../../shared/workflows';

export const workflowKindIcons = {
  start: MessageCircle,
  aiResponds: MousePointerClick,
  sendImage: ImageIcon,
  sendText: MessageSquare,
  closeConversation: CircleX,
  updateLeadsStatus: ListChecks,
  bookAppointment: CalendarCheck,
  subagent: Bot,
  say: Quote,
  updateState: Pencil,
  agentTransfer: GitFork,
  phoneTransfer: PhoneForwarded,
  tool: Wrench,
  end: Scissors,
} satisfies Record<WorkflowNodeKind, typeof MessageCircle>;

export const workflowAddOptions = ADDABLE_WORKFLOW_NODE_KINDS.map((kind) => ({
  kind,
  label: WORKFLOW_NODE_META[kind].label,
  Icon: workflowKindIcons[kind],
})) satisfies Array<{
  kind: AddableWorkflowNodeKind;
  label: string;
  Icon: typeof MessageCircle;
}>;
