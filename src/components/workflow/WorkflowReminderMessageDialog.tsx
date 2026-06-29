import { useState } from 'react';
import { useParams } from 'react-router';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WhatsAppTemplatePreview } from '@/components/WhatsAppTemplatePreview';
import { WorkflowFollowupTemplatePicker } from './WorkflowFollowupTemplatePicker';
import { useWorkflowAutomationState } from './workflowAutomationState';
import {
  toWorkflowFollowupTemplateSelection,
  useWorkflowWhatsappTemplates,
} from './workflowWhatsappTemplates';

export function WorkflowReminderMessageDialog() {
  const { agentId } = useParams();
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const { reminderTemplate, setReminderTemplate } = useWorkflowAutomationState();
  const { approvedTemplates, templatesLoading } = useWorkflowWhatsappTemplates();
  const createTemplateHref = agentId ? `/dashboard/${agentId}/templates/new` : undefined;

  return (
    <DialogContent
      className="flex h-[720px] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[980px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[980px]"
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
            selectedTemplateKey={reminderTemplate?.key ?? ''}
            searchQuery={templateSearchQuery}
            onSearchQueryChange={setTemplateSearchQuery}
            createTemplateHref={createTemplateHref}
            onSelect={(template) => {
              setReminderTemplate(toWorkflowFollowupTemplateSelection(template));
            }}
          />
        </div>
        <div className="flex h-full min-h-0 w-full flex-col items-center justify-start">
          <WhatsAppTemplatePreview
            templateName={reminderTemplate?.name}
            components={reminderTemplate?.components}
            isLoading={templatesLoading}
            emptyMessage="Select a template to preview"
            className="w-full max-w-[360px]"
          />
        </div>
      </div>
    </DialogContent>
  );
}
