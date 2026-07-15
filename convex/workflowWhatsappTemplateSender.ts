import type { ActionCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import type { WorkflowWhatsappTemplateSnapshot } from '../shared/workflowAutomations';
import type { BroadcastHeaderAsset } from '../shared/broadcastMessage';
import { buildWhatsAppTemplateSendPayloadWithContent } from './whatsappTemplateSendPayload';
import { ensureWhatsAppRecipientPhone } from './whatsappPhone';

const DEFAULT_GRAPH_VERSION = 'v22.0';

export type WorkflowWhatsappSendResult = {
  providerMessageId?: string;
  renderedContent: string;
  headerAsset?: BroadcastHeaderAsset;
};

function parseProviderResponse(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };
  } catch (error) {
    throw new Error(
      `WhatsApp returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

export async function sendWorkflowWhatsappTemplate(
  ctx: ActionCtx,
  args: {
    channel: Doc<'channels'>;
    customer: Doc<'customers'>;
    orgId: string;
    template: Pick<WorkflowWhatsappTemplateSnapshot, 'name' | 'language'>;
  },
): Promise<WorkflowWhatsappSendResult> {
  const { template, renderedContent, headerAsset } =
    await buildWhatsAppTemplateSendPayloadWithContent(ctx, {
      orgId: args.orgId,
      channelId: args.channel._id,
      templateName: args.template.name,
      templateLanguage: args.template.language,
      customerId: args.customer._id,
    });
  if (!renderedContent.trim() && !headerAsset) {
    throw new Error('WhatsApp template has no resolved content');
  }
  const resultPresentation = {
    renderedContent,
    ...(headerAsset ? { headerAsset } : {}),
  };
  if (process.env.SKIP_MESSAGE_TEMPLATE_SEND === 'true') {
    return {
      providerMessageId: `workflow-${crypto.randomUUID()}`,
      ...resultPresentation,
    };
  }
  const accessToken = args.channel.accessToken?.trim();
  if (!accessToken) throw new Error('WhatsApp channel has no access token');
  const phoneNumberId = args.channel.phoneNumberId?.trim();
  if (!phoneNumberId) throw new Error('WhatsApp channel has no phone number ID');
  const rawRecipient = args.customer.contactAddress.trim() || args.customer.phone?.trim();
  if (!rawRecipient) throw new Error('Customer has no WhatsApp phone number');
  const graphVersion = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: ensureWhatsAppRecipientPhone(rawRecipient),
      type: 'template',
      template,
    }),
  });
  const text = await response.text();
  const body = parseProviderResponse(text);
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `WhatsApp HTTP ${response.status}: ${text}`);
  }
  return {
    providerMessageId: body?.messages?.[0]?.id,
    ...resultPresentation,
  };
}
