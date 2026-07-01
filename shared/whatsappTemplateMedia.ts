export const WHATSAPP_TEMPLATE_MEDIA_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'video/mp4',
] as const;

export type WhatsAppTemplateMediaMimeType =
  (typeof WHATSAPP_TEMPLATE_MEDIA_TYPES)[number];

export type WhatsAppTemplateHeaderFormat = 'DOCUMENT' | 'IMAGE' | 'VIDEO';
export type WhatsAppTemplateSendMediaType = 'document' | 'image' | 'video';

type WhatsAppTemplateMediaSpec = {
  mimeType: WhatsAppTemplateMediaMimeType;
  headerFormat: WhatsAppTemplateHeaderFormat;
  sendType: WhatsAppTemplateSendMediaType;
  extension: string;
  label: string;
};

const MEDIA_SPECS: Record<WhatsAppTemplateMediaMimeType, WhatsAppTemplateMediaSpec> = {
  'application/pdf': {
    mimeType: 'application/pdf',
    headerFormat: 'DOCUMENT',
    sendType: 'document',
    extension: 'pdf',
    label: 'PDF document',
  },
  'image/jpeg': {
    mimeType: 'image/jpeg',
    headerFormat: 'IMAGE',
    sendType: 'image',
    extension: 'jpg',
    label: 'JPEG image',
  },
  'image/jpg': {
    mimeType: 'image/jpg',
    headerFormat: 'IMAGE',
    sendType: 'image',
    extension: 'jpg',
    label: 'JPG image',
  },
  'image/png': {
    mimeType: 'image/png',
    headerFormat: 'IMAGE',
    sendType: 'image',
    extension: 'png',
    label: 'PNG image',
  },
  'video/mp4': {
    mimeType: 'video/mp4',
    headerFormat: 'VIDEO',
    sendType: 'video',
    extension: 'mp4',
    label: 'MP4 video',
  },
};

export function getWhatsAppTemplateMediaSpec(
  mimeType: string | null | undefined,
): WhatsAppTemplateMediaSpec | null {
  if (!mimeType) return null;
  const normalized = mimeType.trim().toLowerCase();
  if (!WHATSAPP_TEMPLATE_MEDIA_TYPES.includes(normalized as WhatsAppTemplateMediaMimeType)) {
    return null;
  }
  return MEDIA_SPECS[normalized as WhatsAppTemplateMediaMimeType];
}

export function assertWhatsAppTemplateMediaSpec(
  mimeType: string | null | undefined,
): WhatsAppTemplateMediaSpec {
  const spec = getWhatsAppTemplateMediaSpec(mimeType);
  if (spec === null) {
    throw new Error(
      'Unsupported WhatsApp template media type. Use PDF, JPEG, JPG, PNG, or MP4.',
    );
  }
  return spec;
}

export function whatsappTemplateMediaAcceptForFormat(
  format: WhatsAppTemplateHeaderFormat,
) {
  if (format === 'DOCUMENT') return 'application/pdf';
  if (format === 'IMAGE') return 'image/jpeg,image/jpg,image/png';
  return 'video/mp4';
}

export function whatsappTemplateMediaFilename(
  filename: string | null | undefined,
  mimeType: WhatsAppTemplateMediaMimeType,
) {
  const trimmed = filename?.trim();
  if (trimmed) return trimmed;
  return `template_header.${MEDIA_SPECS[mimeType].extension}`;
}
