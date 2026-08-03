import { WorkflowRequiredLabel } from './WorkflowRequiredLabel';

type WorkflowSendMediaTitleProps = {
  nodeKind: 'sendImage' | 'sendFile';
  title: string;
};

export function WorkflowSendMediaTitle({
  nodeKind,
  title,
}: WorkflowSendMediaTitleProps) {
  return (
    <h4 className="truncate text-sm font-semibold text-foreground">
      <WorkflowRequiredLabel>{title}</WorkflowRequiredLabel>
    </h4>
  );
}
