import { WorkflowRequiredLabel } from './WorkflowRequiredLabel';

type WorkflowSendMediaTitleProps = {
  title: string;
};

export function WorkflowSendMediaTitle({
  title,
}: WorkflowSendMediaTitleProps) {
  return (
    <h4 className="truncate text-sm font-semibold text-foreground">
      <WorkflowRequiredLabel>{title}</WorkflowRequiredLabel>
    </h4>
  );
}
