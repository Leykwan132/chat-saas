import { useRef, useState } from 'react';
import { useParams } from 'react-router';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WhatsAppTemplatePreview } from '@/components/WhatsAppTemplatePreview';
import { WorkflowFollowupTemplatePicker } from './WorkflowFollowupTemplatePicker';
import { useWorkflowAutomationState } from './workflowAutomationContext';
import {
  toWorkflowFollowupTemplateSelection,
  useWorkflowWhatsappTemplates,
} from './workflowWhatsappTemplates';

export function WorkflowReminderMessageDialog() {
  const { agentId } = useParams();
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const { reminderTemplate, setReminderTemplate } = useWorkflowAutomationState();
  const [pendingTemplate, setPendingTemplate] = useState(reminderTemplate);
  const confirmedSelectionRef = useRef(false);
  const { approvedTemplates, templatesLoading } = useWorkflowWhatsappTemplates();
  const createTemplateHref = agentId ? `/dashboard/${agentId}/templates/new` : undefined;
  const confirmTemplate = () => {
    if (!pendingTemplate) return;
    confirmedSelectionRef.current = true;
    setReminderTemplate(pendingTemplate);
  };
  const resetPendingTemplate = () => {
    if (!confirmedSelectionRef.current) {
      setPendingTemplate(reminderTemplate);
    }
    confirmedSelectionRef.current = false;
    setTemplateSearchQuery('');
  };

  return (
    <DialogContent
      className="flex h-[936px] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[1274px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1274px]"
      onCloseAutoFocus={resetPendingTemplate}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <DialogHeader className="shrink-0 border-b border-border px-6 py-6 pr-14">
        <DialogTitle>Select a reminder message</DialogTitle>
        <DialogDescription>
          This WhatsApp template will be sent only to customers with booked appointments.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden px-6 py-6 lg:grid-cols-[minmax(320px,1fr)_minmax(320px,360px)] lg:items-stretch">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <WorkflowFollowupTemplatePicker
            templates={approvedTemplates}
            templatesLoading={templatesLoading}
            selectedTemplateKey={pendingTemplate?.key ?? ''}
            searchQuery={templateSearchQuery}
            onSearchQueryChange={setTemplateSearchQuery}
            createTemplateHref={createTemplateHref}
            onSelect={(template) => {
              setPendingTemplate(toWorkflowFollowupTemplateSelection(template));
            }}
          />
        </div>
        <div className="flex h-full min-h-0 w-full flex-col items-center justify-start">
          <WhatsAppTemplatePreview
            templateName={pendingTemplate?.name}
            components={pendingTemplate?.components}
            isLoading={templatesLoading}
            emptyMessage="Select a template to preview"
            className="w-full max-w-[360px]"
          />
        </div>
      </div>
      <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
        <DialogClose asChild>
          <Button type="button" disabled={!pendingTemplate} onClick={confirmTemplate}>
            Confirm
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
