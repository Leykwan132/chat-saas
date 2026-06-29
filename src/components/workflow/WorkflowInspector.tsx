import { useEffect, useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import {
  isWorkflowActionNodeKind,
  workflowConditionDisplayLabel,
  workflowNodeTitle,
} from '../../../shared/workflows';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { WorkflowBookingServicesSection } from './WorkflowBookingServicesSection';

const CUSTOM_ACTION_CONDITION_SUGGESTIONS = [
  {
    label: 'Pricing question',
    detail: 'If the customer asks about pricing or packages',
  },
  {
    label: 'Needs guidance',
    detail: 'If the customer needs help choosing an option',
  },
  {
    label: 'Human support',
    detail: 'If the customer asks to speak with a human',
  },
];

type WorkflowInspectorProps = {
  agentId?: Id<'agents'>;
  node?: Doc<'workflowNodes'>;
  conditionEdge?: Doc<'workflowEdges'>;
  isSaving?: boolean;
  onSave: (values: {
    title: string;
    description: string;
    conditionLabel?: string;
    conditionDetail?: string;
    allowedAutoBookingServiceIds?: Id<'autoBookingServices'>[];
  }) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function WorkflowInspector({
  agentId,
  node,
  conditionEdge,
  isSaving = false,
  onSave,
  onRemove,
  onClose,
}: WorkflowInspectorProps) {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [conditionLabel, setConditionLabel] = useState('');
  const [conditionDetail, setConditionDetail] = useState('');
  const [allowedAutoBookingServiceIds, setAllowedAutoBookingServiceIds] = useState<
    Id<'autoBookingServices'>[] | undefined
  >();

  useEffect(() => {
    setTitle(node?.title ?? '');
    setGoal(node?.description ?? '');
    setConditionLabel(workflowConditionDisplayLabel(conditionEdge?.label) ?? '');
    setConditionDetail(conditionEdge?.detail ?? '');
    setAllowedAutoBookingServiceIds(
      node?.kind === 'bookAppointment'
        ? node.allowedAutoBookingServiceIds
        : undefined,
    );
  }, [conditionEdge?.detail, conditionEdge?.label, node]);

  const selectedTitle = node ? title.trim() || workflowNodeTitle(node.kind) : '';
  const conditionEnabled = conditionEdge !== undefined;
  const isAction = node ? isWorkflowActionNodeKind(node.kind) : false;
  const isQuestionAnswerAction = node?.kind === 'answerQuestions';
  const isCustomAction = node?.kind === 'aiResponds';
  const isBookAppointmentAction = node?.kind === 'bookAppointment';
  const hasGoalField = isAction || Boolean(node?.description);
  const nameLabel = isAction ? 'Action Name' : 'Title';
  const goalLabel = isAction ? 'Goal' : 'Description';
  let conditionLabelPlaceholder = 'e.g., Ready to book';
  let conditionDetailPlaceholder = 'Describe when this action should run';
  if (isQuestionAnswerAction) {
    conditionLabelPlaceholder = 'e.g., Customer question';
    conditionDetailPlaceholder = 'If the customer asks about...';
  } else if (isCustomAction) {
    conditionLabelPlaceholder = 'e.g., Pricing question';
    conditionDetailPlaceholder = 'If the customer asks about...';
  }
  const contentGridClassName = conditionEnabled
    ? 'grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'
    : 'grid gap-8';
  const saveDisabled = isSaving || !title.trim() || (isAction && !goal.trim());

  return (
    <Dialog open={Boolean(node)} onOpenChange={(open) => !open && onClose()}>
      {node ? (
        <DialogContent className="flex max-h-[min(90vh,760px)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[920px]">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-5 pr-14">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg">{selectedTitle}</DialogTitle>
                <DialogDescription>
                  Configure when this workflow node runs and what the AI should do.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={node.kind === 'start' || node.kind === 'end' || isSaving}
                onClick={onRemove}
                className="mr-8 shrink-0"
              >
                <Trash2 data-icon="inline-start" />
                <span className="sr-only">Remove node</span>
              </Button>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <FieldGroup className="gap-6">
              <div className={contentGridClassName}>
                {conditionEnabled ? (
                  <section className="flex flex-col gap-5 text-left">
                    <h3 className="text-base font-semibold text-foreground">Condition</h3>
                    <Field>
                      <FieldLabel htmlFor="workflow-node-condition-label">Condition Label</FieldLabel>
                      <Input
                        id="workflow-node-condition-label"
                        value={conditionLabel}
                        onChange={(event) => setConditionLabel(event.target.value)}
                        placeholder={conditionLabelPlaceholder}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="workflow-node-condition-detail">Condition Detail</FieldLabel>
                      <Textarea
                        id="workflow-node-condition-detail"
                        value={conditionDetail}
                        onChange={(event) => setConditionDetail(event.target.value)}
                        placeholder={conditionDetailPlaceholder}
                        rows={6}
                        style={{ minHeight: '11rem' }}
                      />
                      {isCustomAction ? (
                        <div className="flex flex-wrap gap-2">
                          {CUSTOM_ACTION_CONDITION_SUGGESTIONS.map((suggestion) => (
                            <Button
                              key={suggestion.label}
                              type="button"
                              variant="outline"
                              size="xs"
                              className="h-auto min-h-8 justify-start whitespace-normal rounded-md px-2 py-1.5 text-left leading-snug"
                              onClick={() => {
                                setConditionLabel(suggestion.label);
                                setConditionDetail(suggestion.detail);
                              }}
                            >
                              {suggestion.label}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </Field>
                  </section>
                ) : null}
                <section className="flex flex-col gap-5 text-left">
                  <h3 className="text-base font-semibold text-foreground">Actions</h3>
                  <Field className="items-start text-left">
                    <FieldLabel className="text-left" htmlFor="workflow-node-title">{nameLabel}</FieldLabel>
                    <Input
                      id="workflow-node-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="text-left"
                    />
                  </Field>
                  {hasGoalField ? (
                    <Field className="items-start text-left">
                      <FieldLabel className="text-left" htmlFor="workflow-node-description">{goalLabel}</FieldLabel>
                      <Textarea
                        id="workflow-node-description"
                        value={goal}
                        onChange={(event) => setGoal(event.target.value)}
                        className="text-left"
                        rows={isAction ? 10 : 4}
                        style={isAction ? { minHeight: '16rem' } : undefined}
                      />
                    </Field>
                  ) : null}
                  {isBookAppointmentAction && agentId ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-semibold text-foreground">Services</h4>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          AI will only book services that are available.
                        </p>
                      </div>
                      <WorkflowBookingServicesSection
                        agentId={agentId}
                        allowedServiceIds={allowedAutoBookingServiceIds}
                        onAllowedServiceIdsChange={setAllowedAutoBookingServiceIds}
                      />
                    </div>
                  ) : null}
                </section>
              </div>
            </FieldGroup>
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button
              type="button"
              disabled={saveDisabled}
              onClick={() => onSave({
                title,
                description: hasGoalField ? goal : '',
                conditionLabel: conditionEnabled ? conditionLabel : undefined,
                conditionDetail: conditionEnabled ? conditionDetail : undefined,
                allowedAutoBookingServiceIds: isBookAppointmentAction
                  ? allowedAutoBookingServiceIds
                  : undefined,
              })}
            >
              {isSaving ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
