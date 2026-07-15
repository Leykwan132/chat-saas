import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';

export const whatsappTemplateStatusValidator = v.union(
  v.literal('submitting'),
  v.literal('submitted'),
  v.literal('in_review'),
  v.literal('approved'),
  v.literal('failed'),
);

export type WhatsAppTemplateStatus =
  | 'submitting'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'failed';

export function normalizeWhatsAppTemplateLanguage(value: string) {
  return value.trim().toLowerCase().replaceAll('-', '_');
}

export function normalizeWhatsAppTemplateCategory(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'MARKETING' || normalized === 'UTILITY') return normalized;
  return undefined;
}

export function normalizeMetaTemplateId(value: string | number | undefined) {
  if (value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function terminalEventReason(event: string) {
  return `Meta reported ${event.toLowerCase().replaceAll('_', ' ')}.`;
}

export function mapMetaTemplateEvent(event: string, reason?: string) {
  const normalizedEvent = event.trim().toUpperCase();
  if (normalizedEvent === 'APPROVED' || normalizedEvent === 'REINSTATED') {
    return { status: 'approved' as const, error: undefined };
  }
  if (normalizedEvent === 'PENDING' || normalizedEvent === 'IN_APPEAL') {
    return { status: 'in_review' as const, error: undefined };
  }
  if (
    ['REJECTED', 'PENDING_DELETION', 'DELETED', 'DISABLED', 'FLAGGED']
      .includes(normalizedEvent)
  ) {
    return {
      status: 'failed' as const,
      error: reason?.trim() || terminalEventReason(normalizedEvent),
    };
  }
  return null;
}

export function canApplyMetaTemplateStatus(
  current: WhatsAppTemplateStatus,
  next: 'in_review' | 'approved' | 'failed',
) {
  return next !== 'in_review' || (current !== 'approved' && current !== 'failed');
}

export function projectWhatsAppTemplate(template: Doc<'whatsappTemplates'>) {
  return {
    _id: template._id,
    channelId: template.channelId,
    name: template.name,
    language: template.language,
    purpose: template.purpose,
    category: template.category,
    parameterFormat: template.parameterFormat,
    components: template.components,
    status: template.status,
    error: template.error,
    metaTemplateId: template.metaTemplateId,
    createdAt: template.createdAt,
    statusUpdatedAt: template.statusUpdatedAt,
  };
}
