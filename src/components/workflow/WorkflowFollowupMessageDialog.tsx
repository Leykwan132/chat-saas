import { useRef, useState } from 'react';
import { Check, ChevronLeft, ListOrdered, Repeat } from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WhatsAppTemplatePreview } from '@/components/WhatsAppTemplatePreview';
import { cn } from '@/lib/utils';
import { WorkflowFollowupTemplatePicker } from './WorkflowFollowupTemplatePicker';
import {
  useWorkflowAutomationState,
  type WorkflowFollowupMessageStrategy,
} from './workflowAutomationContext';
import { useWorkflowFollowupSummary } from './workflowFollowupSummary';
import {
  toWorkflowFollowupTemplateSelection,
  useWorkflowWhatsappTemplates,
} from './workflowWhatsappTemplates';

type MessageStage = 'strategy' | 'configure';

function messageStrategyMeta(strategy: WorkflowFollowupMessageStrategy) {
  return strategy === 'same'
    ? {
      Icon: Repeat,
      title: 'Same message',
      description: 'Send one template every time.',
    }
    : {
      Icon: ListOrdered,
      title: 'Different messages',
      description: 'Use a new template for each follow-up.',
    };
}

function StrategyCard({
  strategy,
  onSelect,
}: {
  strategy: WorkflowFollowupMessageStrategy;
  onSelect: (strategy: WorkflowFollowupMessageStrategy) => void;
}) {
  const { Icon, description, title } = messageStrategyMeta(strategy);

  return (
    <button
      type="button"
      onClick={() => onSelect(strategy)}
      className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-zinc-50/80 p-6 text-left transition-colors hover:border-neutral-400 dark:bg-zinc-900/20 dark:hover:border-neutral-600"
    >
      <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="m-0 text-base font-semibold text-foreground">{title}</h4>
        <p className="m-0 text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

export function WorkflowFollowupMessageDialog({
  initialStage = 'strategy',
}: {
  initialStage?: MessageStage;
}) {
  const { agentId } = useParams();
  const {
    dataMode,
    followupAttemptTemplates,
    followupMessageStrategy,
    followupSameTemplate,
    setFollowupAttemptTemplate,
    setFollowupMessageStrategy,
    setFollowupSameTemplate,
  } = useWorkflowAutomationState();
  const summary = useWorkflowFollowupSummary();
  const maxAttemptsCount = Math.max(1, Number(summary.maxAttemptsLabel) || 1);
  const singleAttempt = maxAttemptsCount === 1;
  const initialMessageStage = singleAttempt ? 'configure' : initialStage;
  const initialMessageStrategy = singleAttempt ? 'same' : followupMessageStrategy;
  const initialSameTemplate = singleAttempt && followupMessageStrategy === 'different'
    ? followupAttemptTemplates[0]
    : followupSameTemplate;
  const [stage, setStage] = useState<MessageStage>(initialMessageStage);
  const [activeAttemptIndex, setActiveAttemptIndex] = useState(0);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [pendingMessageStrategy, setPendingMessageStrategy] =
    useState(initialMessageStrategy);
  const [pendingSameTemplate, setPendingSameTemplate] =
    useState(initialSameTemplate);
  const [pendingAttemptTemplates, setPendingAttemptTemplates] =
    useState([...followupAttemptTemplates]);
  const confirmedConfigurationRef = useRef(false);
  const { approvedTemplates, templatesLoading } = useWorkflowWhatsappTemplates(dataMode);
  const attempts = Array.from({ length: maxAttemptsCount }, (_, index) => index);
  const boundedActiveAttemptIndex = Math.min(activeAttemptIndex, maxAttemptsCount - 1);
  const selectedTemplate = pendingMessageStrategy === 'same'
    ? pendingSameTemplate
    : pendingAttemptTemplates[boundedActiveAttemptIndex];
  const createTemplateHref = agentId ? `/dashboard/${agentId}/templates/new` : undefined;
  const configureTitle = pendingMessageStrategy === 'same'
    ? 'Select a message'
    : 'Select messages';
  const configureDescription = singleAttempt
    ? 'This message will be sent for the follow-up.'
    : pendingMessageStrategy === 'same'
      ? `This message will be sent for all ${maxAttemptsCount} follow-ups.`
      : 'Choose a message for each follow-up.';
  const canConfirmTemplates = pendingMessageStrategy === 'same'
    ? Boolean(pendingSameTemplate)
    : attempts.every((attemptIndex) => Boolean(pendingAttemptTemplates[attemptIndex]));
  const confirmTemplates = () => {
    if (!canConfirmTemplates) return;
    confirmedConfigurationRef.current = true;
    setFollowupMessageStrategy(pendingMessageStrategy);
    if (pendingMessageStrategy === 'same') {
      if (pendingSameTemplate) setFollowupSameTemplate(pendingSameTemplate);
      return;
    }
    attempts.forEach((attemptIndex) => {
      const template = pendingAttemptTemplates[attemptIndex];
      if (template) setFollowupAttemptTemplate(attemptIndex, template);
    });
  };
  const resetPendingConfiguration = () => {
    if (!confirmedConfigurationRef.current) {
      setPendingMessageStrategy(initialMessageStrategy);
      setPendingSameTemplate(initialSameTemplate);
      setPendingAttemptTemplates([...followupAttemptTemplates]);
    }
    confirmedConfigurationRef.current = false;
    setStage(initialMessageStage);
    setActiveAttemptIndex(0);
    setTemplateSearchQuery('');
  };

  return (
    <DialogContent
      className="flex h-[988px] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[1274px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1274px]"
      onCloseAutoFocus={resetPendingConfiguration}
      onOpenAutoFocus={resetPendingConfiguration}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <DialogHeader className="shrink-0 border-b border-border px-6 py-6 pr-14">
        <DialogTitle>
          {stage === 'strategy' ? 'Messages' : configureTitle}
        </DialogTitle>
        <DialogDescription>
          {stage === 'strategy'
            ? "How do you want to message customers who haven't replied?"
            : configureDescription}
        </DialogDescription>
      </DialogHeader>

      {stage === 'strategy' ? (
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-6 px-6 py-6">
          <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            <StrategyCard
              strategy="same"
              onSelect={(strategy) => {
                setPendingMessageStrategy(strategy);
                setActiveAttemptIndex(0);
                setTemplateSearchQuery('');
                setStage('configure');
              }}
            />
            <StrategyCard
              strategy="different"
              onSelect={(strategy) => {
                setPendingMessageStrategy(strategy);
                setActiveAttemptIndex(0);
                setTemplateSearchQuery('');
                setStage('configure');
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-6 py-6">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[minmax(320px,1fr)_minmax(320px,360px)] lg:items-stretch">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              {pendingMessageStrategy === 'different' && (
                <>
                  <p className="mb-3 shrink-0 text-sm font-semibold text-foreground">
                    Follow-up
                  </p>
                  <div className="mb-4 flex flex-wrap justify-start gap-3">
                    {attempts.map((attemptIndex) => {
                      const complete = Boolean(pendingAttemptTemplates[attemptIndex]);
                      const active = boundedActiveAttemptIndex === attemptIndex;
                      return (
                        <button
                          key={attemptIndex}
                          type="button"
                          onClick={() => {
                            setActiveAttemptIndex(attemptIndex);
                            setTemplateSearchQuery('');
                          }}
                          className={cn(
                            'flex size-14 items-center justify-center rounded-lg border-2 transition-colors',
                            complete
                              ? 'border-emerald-800 bg-emerald-800 dark:border-emerald-900 dark:bg-emerald-900'
                              : active
                                ? 'border-foreground bg-zinc-100 dark:bg-zinc-900/40'
                                : 'border-border bg-background hover:border-neutral-400 dark:hover:border-neutral-600',
                          )}
                        >
                          {complete ? (
                            <Check className="size-5 text-white" strokeWidth={2.5} />
                          ) : (
                            <span className={cn(
                              'text-sm font-semibold',
                              active ? 'text-foreground' : 'text-muted-foreground',
                            )}
                            >
                              {attemptIndex + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              <WorkflowFollowupTemplatePicker
                templates={approvedTemplates}
                templatesLoading={templatesLoading}
                selectedTemplateKey={selectedTemplate?.key ?? ''}
                searchQuery={templateSearchQuery}
                onSearchQueryChange={setTemplateSearchQuery}
                createTemplateHref={createTemplateHref}
                onSelect={(template) => {
                  const selection = toWorkflowFollowupTemplateSelection(template);
                  if (pendingMessageStrategy === 'same') {
                    setPendingSameTemplate(selection);
                    return;
                  }
                  setPendingAttemptTemplates((current) => {
                    const next = [...current];
                    next[boundedActiveAttemptIndex] = selection;
                    return next;
                  });
                }}
              />
            </div>
            <div className="flex h-full min-h-0 w-full flex-col items-center justify-start">
              <WhatsAppTemplatePreview
                templateName={selectedTemplate?.name}
              components={selectedTemplate?.components}
              isLoading={templatesLoading}
              emptyMessage="Select a template to preview"
              overrideHeaderMediaPreviewUrl={dataMode === 'local' ? null : undefined}
              className="w-full max-w-[360px]"
              />
            </div>
          </div>
          <DialogFooter
            className={cn(
              'shrink-0 flex-row border-t border-border pt-5',
              singleAttempt ? 'justify-end sm:justify-end' : 'justify-between sm:justify-between',
            )}
          >
            {!singleAttempt && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStage('strategy')}
                className="h-10 gap-2 px-4 font-bold transition-all active:scale-[0.98]"
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
            )}
            <DialogClose asChild>
              <Button
                type="button"
                disabled={!canConfirmTemplates}
                onClick={confirmTemplates}
              >
                Confirm
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      )}
    </DialogContent>
  );
}
