import { useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import {
  workflowConditionDisplayLabel,
  workflowNodeTitle,
} from '../../../shared/workflows';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { WorkflowBookingServicesSection } from './WorkflowBookingServicesSection';
import { getWorkflowInspectorBehavior } from './workflowInspectorBehavior';
import { WorkflowSendMediaSection } from './WorkflowSendMediaSection';

const CUSTOM_ACTION_CONDITION_SUGGESTIONS = [
  { name: 'Pricing question', detail: 'If the customer asks about pricing or packages' },
  { name: 'Needs guidance', detail: 'If the customer needs help choosing an option' },
  { name: 'Human support', detail: 'If the customer asks to speak with a human' },
];

export type WorkflowInspectorSaveValues = {
  name: string;
  description: string;
  conditionName?: string;
  conditionDetail?: string;
  allowedAppointmentServiceIds?: Id<'appointmentServices'>[];
};

type WorkflowInspectorFormProps = {
  agentId?: Id<'agents'>;
  node: Doc<'workflowNodes'>;
  conditionEdge?: Doc<'workflowEdges'>;
  isSaving: boolean;
  onSave: (values: WorkflowInspectorSaveValues) => void;
  onRemove: () => void;
};

function normalizedPersistedText(value: string | undefined) {
  return value?.trim() ?? '';
}

function normalizedConditionName(value: string | undefined) {
  return workflowConditionDisplayLabel(value) ?? '';
}

function sameOptionalIdSet<T extends string>(first: T[] | undefined, second: T[] | undefined) {
  if (first === undefined || second === undefined) {
    return first === second;
  }
  if (first.length !== second.length) {
    return false;
  }
  const secondSet = new Set(second);
  return first.every((id) => secondSet.has(id));
}

export function WorkflowInspectorForm({
  agentId,
  node,
  conditionEdge,
  isSaving,
  onSave,
  onRemove,
}: WorkflowInspectorFormProps) {
  const [name, setName] = useState(node.title);
  const [goal, setGoal] = useState(node.description ?? '');
  const [conditionName, setConditionName] = useState(
    workflowConditionDisplayLabel(conditionEdge?.label) ?? '',
  );
  const [conditionDetail, setConditionDetail] = useState(conditionEdge?.detail ?? '');
  const [allowedAppointmentServiceIds, setAllowedAppointmentBookingServiceIds] = useState<
    Id<'appointmentServices'>[] | undefined
  >(node.kind === 'bookAppointment' ? node.allowedAppointmentServiceIds : undefined);
  const selectedTitle = name.trim() || workflowNodeTitle(node.kind);
  const conditionEnabled = conditionEdge !== undefined;
  const {
    isAction,
    isSendTextAction,
    isSendMediaAction,
    isSendFileAction,
    hasMediaSection,
    hasGoalField,
    saveRequiresDescription,
    nameLabel,
    goalLabel,
  } = getWorkflowInspectorBehavior(node.kind, Boolean(node.description));
  const isCustomAction = node.kind === 'aiResponds';
  const isBookAppointmentAction = node.kind === 'bookAppointment';
  const isHumanEscalationAction = node.kind === 'humanEscalation';
  let conditionNamePlaceholder = 'e.g., Yes';
  let conditionDetailPlaceholder = 'Describe when this action should run';
  if (isSendTextAction) {
    conditionNamePlaceholder = 'e.g., After hours';
    conditionDetailPlaceholder = 'If the customer reaches this step...';
  } else if (isSendMediaAction) {
    conditionNamePlaceholder = 'e.g., Product photos';
    conditionDetailPlaceholder = 'If the customer asks for photos or videos about...';
  } else if (isSendFileAction) {
    conditionNamePlaceholder = 'e.g., Product brochure';
    conditionDetailPlaceholder = 'If the customer asks for documents, files, or brochures about...';
  } else if (isCustomAction) {
    conditionNamePlaceholder = 'e.g., Pricing question';
    conditionDetailPlaceholder = 'If the customer asks about...';
  } else if (isHumanEscalationAction) {
    conditionNamePlaceholder = 'e.g., Needs human';
    conditionDetailPlaceholder = 'If the customer asks for a human or the AI cannot answer safely...';
  }
  const contentGridClassName = conditionEnabled
    ? 'grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'
    : 'grid gap-8';
  const hasNodeChanges = (
    normalizedPersistedText(name) !== normalizedPersistedText(node.title) ||
    (
      hasGoalField &&
      normalizedPersistedText(goal) !== normalizedPersistedText(node.description)
    ) ||
    (
      conditionEnabled &&
      (
        normalizedConditionName(conditionName) !== normalizedConditionName(conditionEdge.label) ||
        normalizedPersistedText(conditionDetail) !== normalizedPersistedText(conditionEdge.detail)
      )
    ) ||
    (
      isBookAppointmentAction &&
      !sameOptionalIdSet(allowedAppointmentServiceIds, node.allowedAppointmentServiceIds)
    )
  );
  const saveDisabled = isSaving || !name.trim() || (saveRequiresDescription && !goal.trim()) || !hasNodeChanges;

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-border px-6 py-5 pr-14">
        <div className="min-w-0">
          <DialogTitle className="truncate text-lg">{selectedTitle}</DialogTitle>
          <DialogDescription>
            Configure when this workflow node runs and what the AI should do.
          </DialogDescription>
        </div>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <FieldGroup className="gap-6">
          <div className={contentGridClassName}>
            {conditionEnabled ? (
              <section className="flex flex-col gap-5 text-left">
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-foreground">Condition</h3>
                  <FieldDescription className="text-xs">
                    Decide when this node should run in the conversation.
                  </FieldDescription>
                </div>
                <Field>
                  <FieldLabel htmlFor="workflow-node-condition-name">Name</FieldLabel>
                  <Input
                    id="workflow-node-condition-name"
                    value={conditionName}
                    onChange={(event) => setConditionName(event.target.value)}
                    placeholder={conditionNamePlaceholder}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="workflow-node-condition-detail">Detail</FieldLabel>
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
                          key={suggestion.name}
                          type="button"
                          variant="outline"
                          size="xs"
                          className="h-auto min-h-8 justify-start whitespace-normal rounded-md px-2 py-1.5 text-left leading-snug"
                          onClick={() => {
                            setConditionName(suggestion.name);
                            setConditionDetail(suggestion.detail);
                          }}
                        >
                          {suggestion.name}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </Field>
              </section>
            ) : null}
            <section className="flex flex-col gap-5 text-left">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-foreground">Actions</h3>
                <FieldDescription className="text-xs">
                  Define what the AI should do after the condition matches.
                </FieldDescription>
              </div>
              <Field className="items-start text-left">
                <FieldLabel className="text-left" htmlFor="workflow-node-title">{nameLabel}</FieldLabel>
                <Input
                  id="workflow-node-title"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
                    allowedServiceIds={allowedAppointmentServiceIds}
                    onAllowedServiceIdsChange={setAllowedAppointmentBookingServiceIds}
                  />
                </div>
              ) : null}
              {hasMediaSection && agentId ? (
                <WorkflowSendMediaSection
                  agentId={agentId}
                  nodeId={node._id}
                  nodeKind={isSendFileAction ? 'sendFile' : 'sendImage'}
                />
              ) : null}
            </section>
          </div>
        </FieldGroup>
      </div>
      <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-600/25 dark:hover:bg-red-950/30"
          disabled={node.kind === 'start' || node.kind === 'end' || isSaving}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete node</span>
        </Button>
        <Button
          type="button"
          disabled={saveDisabled}
          onClick={() => onSave({
            name,
            description: hasGoalField ? goal : '',
            conditionName: conditionEnabled ? conditionName : undefined,
            conditionDetail: conditionEnabled ? conditionDetail : undefined,
            allowedAppointmentServiceIds: isBookAppointmentAction
              ? allowedAppointmentServiceIds
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
    </>
  );
}
