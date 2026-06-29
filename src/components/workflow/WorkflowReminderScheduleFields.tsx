import { Label } from '@/components/ui/label';
import { WorkflowReminderTimingRow } from './WorkflowReminderTimingRow';
import { useWorkflowReminderTimingField } from './workflowReminderSummary';

const reminderTimingField = {
  label: 'When to remind',
};

function ReminderTimingList() {
  const { selectedOptionIds, setSelectedOptionIds } = useWorkflowReminderTimingField();
  const activeOptionId = selectedOptionIds[0];
  if (!activeOptionId) throw new Error('Reminder timing selection is missing');

  return (
    <div className="flex flex-col gap-2.5">
      <Label className="text-[11px] font-semibold text-foreground">
        {reminderTimingField.label}
      </Label>
      <div className="flex flex-col gap-2">
        <WorkflowReminderTimingRow
          optionId={activeOptionId}
          onUpdateOptionId={(nextOptionId) => {
            setSelectedOptionIds([nextOptionId]);
          }}
        />
      </div>
    </div>
  );
}

export function WorkflowReminderScheduleFields() {
  return (
    <div
      className="nodrag nopan grid grid-cols-1 gap-4"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <ReminderTimingList />
    </div>
  );
}
