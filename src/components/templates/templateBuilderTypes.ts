import type {
  WhatsAppTemplateHeaderFormat,
  WhatsAppTemplateMediaMimeType,
} from '../../../shared/whatsappTemplateMedia';

export type Purpose = 'broadcasting' | 'follow_up';
export type HeaderType = 'TEXT' | WhatsAppTemplateHeaderFormat;
export type MediaHeaderType = WhatsAppTemplateHeaderFormat;
export type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
export type UploadStatus = 'idle' | 'ready' | 'failed';

export type TemplateButton =
  | { type: 'QUICK_REPLY'; text: string }
  | { type: 'URL'; text: string; url: string }
  | { type: 'PHONE_NUMBER'; text: string; phone_number: string }
  | { type: 'COPY_CODE'; text: string; example: string };

export type TemplateComponent =
  | { type: 'HEADER'; format: 'TEXT'; text: string }
  | {
      type: 'HEADER';
      format: WhatsAppTemplateHeaderFormat;
      r2Key: string;
      filename: string;
      mimeType: WhatsAppTemplateMediaMimeType;
    }
  | {
      type: 'BODY';
      text: string;
      example?: {
        body_text_named_params: Array<{ param_name: string; example: string }>;
      };
    }
  | { type: 'FOOTER'; text: string }
  | { type: 'BUTTONS'; buttons: TemplateButton[] };

export type TemplateBodyComponent = Extract<TemplateComponent, { type: 'BODY' }>;

export type HeaderMediaState = {
  r2Key: string | null;
  previewUrl: string | null;
  pendingFile: File | null;
  uploadStatus: UploadStatus;
  fileName: string | null;
  fileSize: number | null;
  fileMime: string | null;
};

export type HeaderMediaByType = Partial<Record<MediaHeaderType, HeaderMediaState>>;

export type TemplateLibraryPreset = {
  id: string;
  name: string;
  title: string;
  description: string;
  category: 'marketing' | 'utility';
  headerText: string;
  bodyText: string;
  buttons: TemplateButton[];
};
