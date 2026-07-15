import { useEffect, useMemo, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { WorkflowWhatsappTemplateExample } from '../../../shared/workflowAutomations';

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

export function useWorkflowWhatsappTemplates() {
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const listTemplates = useAction(api.whatsappBroadcast.listTemplates);
  const [templates, setTemplates] = useState<WorkflowWhatsappTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

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

  useEffect(() => {
    if (!channelId) {
      setTemplates([]);
      setTemplatesLoading(false);
      return;
    }

    let cancelled = false;
    setTemplatesLoading(true);

    listTemplates({ channelId })
      .then((result) => {
        if (cancelled) return;
        setTemplates(
          (result.templates ?? [])
            .map((row) => normalizeTemplate(row))
            .filter((template): template is WorkflowWhatsappTemplate => template !== null),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setTemplates([]);
        toast.error(error instanceof Error ? error.message : 'Failed to load templates');
      })
      .finally(() => {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [channelId, listTemplates]);

  const approvedTemplates = useMemo(() => (
    templates.filter((template) => template.status === 'APPROVED')
  ), [templates]);

  return {
    approvedTemplates,
    templatesLoading: channels === undefined || templatesLoading,
    whatsappChannelCount: whatsappChannels.length,
  };
}
