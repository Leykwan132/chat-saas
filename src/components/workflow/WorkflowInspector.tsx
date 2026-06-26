import { useEffect, useState } from 'react';
import { Loader2, Save, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Doc } from '../../../convex/_generated/dataModel';
import {
  isWorkflowActionNodeKind,
  workflowConditionDisplayLabel,
  workflowNodeTitle,
} from '../../../shared/workflows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';

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
  node?: Doc<'workflowNodes'>;
  conditionEdge?: Doc<'workflowEdges'>;
  isSaving?: boolean;
  onSave: (values: {
    title: string;
    description: string;
    conditionLabel?: string;
    conditionDetail?: string;
  }) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function WorkflowInspector({
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

  useEffect(() => {
    setTitle(node?.title ?? '');
    setGoal(node?.description ?? '');
    setConditionLabel(workflowConditionDisplayLabel(conditionEdge?.label) ?? '');
    setConditionDetail(conditionEdge?.detail ?? '');
  }, [conditionEdge?.detail, conditionEdge?.label, node]);

  const selectedTitle = node ? title.trim() || workflowNodeTitle(node.kind) : '';
  const conditionEnabled = conditionEdge !== undefined;
  const isAction = node ? isWorkflowActionNodeKind(node.kind) : false;
  const isCustomAction = node?.kind === 'aiResponds';
  const hasGoalField = isAction || Boolean(node?.description);
  const nameLabel = isAction ? 'Action Name' : 'Title';
  const goalLabel = isAction ? 'Goal' : 'Description';
  const conditionLabelPlaceholder = isCustomAction ? 'e.g., Pricing question' : 'e.g., Ready to book';
  const conditionDetailPlaceholder = isCustomAction
    ? 'If the customer asks about...'
    : 'Describe when this action should run';
  const saveDisabled = isSaving || !title.trim() || (isAction && !goal.trim());

  return (
    <AnimatePresence>
      {node ? (
        <motion.aside
          key="workflow-inspector"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto absolute inset-y-0 right-0 z-30 flex w-[min(24rem,100%)] flex-col border-l border-border bg-background/95 shadow-xl backdrop-blur"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="min-w-0 truncate text-sm font-semibold leading-8 text-foreground">
              {selectedTitle}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={node.kind === 'start' || node.kind === 'end' || isSaving}
                onClick={onRemove}
              >
                <Trash2 data-icon="inline-start" />
                <span className="sr-only">Remove node</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
              >
                <X data-icon="inline-start" />
                <span className="sr-only">Close node setup</span>
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <FieldGroup className="gap-4">
              {conditionEnabled ? (
                <>
                  <section className="space-y-4 text-left">
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
                        rows={4}
                        style={{ minHeight: '7rem' }}
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
                  <Separator />
                </>
              ) : null}
              <section className="space-y-4 text-left">
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
                      rows={isAction ? 8 : 3}
                      style={isAction ? { minHeight: '13rem' } : undefined}
                    />
                  </Field>
                ) : null}
              </section>
            </FieldGroup>
            <Button
              type="button"
              className="mt-4"
              disabled={saveDisabled}
              onClick={() => onSave({
                title,
                description: hasGoalField ? goal : '',
                conditionLabel: conditionEnabled ? conditionLabel : undefined,
                conditionDetail: conditionEnabled ? conditionDetail : undefined,
              })}
            >
              {isSaving ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              Save
            </Button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
