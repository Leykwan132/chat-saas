import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { WorkflowWhatsappTemplateExample } from '../../../shared/workflowAutomations';
import type { WorkflowCanvasDataMode } from './workflowAutomationContext';

type WorkflowWhatsappTemplateButton = {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text: string;
  url?: string;
  phone_number?: string;
  example?: string;
};

export type WorkflowWhatsappTemplateComponent = {
  type: string;
  format?: string;
  text?: string;
  r2Key?: string;
  example?: WorkflowWhatsappTemplateExample;
  buttons?: WorkflowWhatsappTemplateButton[];
};

export type WorkflowWhatsappTemplate = {
  key: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: WorkflowWhatsappTemplateComponent[];
};

type TemplateRow = {
  name?: string;
  language?: string;
  status?: string;
  category?: string;
  components?: WorkflowWhatsappTemplateComponent[];
};

export type WorkflowFollowupTemplateSelection = Pick<
  WorkflowWhatsappTemplate,
  'key' | 'name' | 'language' | 'category' | 'components'
>;

export function getWorkflowWhatsappTemplateKey({
  name,
  language,
}: {
  name: string;
  language: string;
}) {
  return `${name}\t${language}`;
}

export function getWorkflowWhatsappTemplateDetail({
  category,
  language,
}: Pick<WorkflowWhatsappTemplate, 'category' | 'language'>) {
  return [language, category ? category.toLowerCase() : undefined]
    .filter(Boolean)
    .join(' · ');
}

function normalizeTemplate(row: TemplateRow): WorkflowWhatsappTemplate | null {
  const name = row.name?.trim() ?? '';
  const language = row.language?.trim() ?? '';
  if (!name || !language) return null;

  return {
    key: getWorkflowWhatsappTemplateKey({ name, language }),
    name,
    language,
    status: row.status ?? 'UNKNOWN',
    category: row.category ?? '',
    components: row.components ?? [],
  };
}

export function toWorkflowFollowupTemplateSelection(
  template: WorkflowWhatsappTemplate,
): WorkflowFollowupTemplateSelection {
  return {
    key: template.key,
    name: template.name,
    language: template.language,
    category: template.category,
    components: template.components,
  };
}

export function useWorkflowWhatsappTemplates(dataMode: WorkflowCanvasDataMode) {
  const channels = useQuery(
    api.channels.listForCurrentOrg,
    dataMode === 'authenticated' ? {} : 'skip',
  );

  const whatsappChannels = useMemo(() => {
    if (!channels) return [];

    return channels.filter((channel) => (
      channel.service === 'whatsapp' &&
      channel.status === 'connected' &&
      Boolean(channel.wabaId?.trim()) &&
      Boolean(channel.phoneNumberId?.trim())
    ));
  }, [channels]);

  const channelId = whatsappChannels[0]?._id;
  const templatesQuery = useQuery(
    api.whatsappTemplateQueries.listApprovedForChannel,
    channelId ? { channelId } : 'skip',
  );
  const approvedTemplates = useMemo(() => (
    (templatesQuery ?? [])
      .map((row) => normalizeTemplate(row))
      .filter((template): template is WorkflowWhatsappTemplate => template !== null)
  ), [templatesQuery]);

  return {
    approvedTemplates,
    templatesLoading:
      dataMode === 'authenticated' && (
        channels === undefined || (Boolean(channelId) && templatesQuery === undefined)
      ),
    whatsappChannelCount: whatsappChannels.length,
  };
}
