export type TemplateCategory = 'marketing' | 'utility';
export type TemplateChannelType = 'whatsapp';

export const DEFAULT_TEMPLATE_LANGUAGE = 'en_US';
export const TEMPLATE_CHANNEL_TYPE: TemplateChannelType = 'whatsapp';

export const TEMPLATE_CATEGORY_COPY: Record<TemplateCategory, { label: string }> = {
  marketing: {
    label: 'Marketing - promotional offers',
  },
  utility: {
    label: 'Utilities - account, order, and booking updates',
  },
};
