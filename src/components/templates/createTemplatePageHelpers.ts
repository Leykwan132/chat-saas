import {
  buildHeaderComponent,
  buildTemplateBodyComponent,
  formattedTemplateButtons,
} from './buildTemplateComponents';
import type { TemplateCategory } from './createTemplateFormTypes';
import type {
  HeaderMediaState,
  HeaderType,
  Purpose,
  TemplateButton,
  TemplateComponent,
} from './templateBuilderTypes';
import { isMediaHeader } from './templateHeaderMediaState';
import { uploadWithProgress } from '@/lib/r2Upload';
import { assertWhatsAppTemplateMediaSpec } from '../../../shared/whatsappTemplateMedia';
import { extractTemplateParameterKeys } from '../../../shared/whatsappTemplateParameters';

export {
  initialHeaderMedia,
  isMediaHeader,
} from './templateHeaderMediaState';

export type PreviewTemplateComponent = {
  type: string;
  format?: string;
  text?: string;
  buttons?: TemplateButton[];
};

export function categoryToPurpose(category: TemplateCategory): Purpose {
  return category === 'marketing' ? 'broadcasting' : 'follow_up';
}

export function buildPreviewComponents(args: {
  headerEnabled: boolean;
  headerType: HeaderType;
  headerText: string;
  headerMediaStatus: HeaderMediaState['uploadStatus'];
  bodyText: string;
  buttonsEnabled: boolean;
  templateButtons: TemplateButton[];
  footerEnabled: boolean;
  footerText: string;
}): PreviewTemplateComponent[] {
  const components: PreviewTemplateComponent[] = [];
  if (args.headerEnabled) {
    if (args.headerType === 'TEXT' && args.headerText.trim()) {
      components.push({ type: 'HEADER', format: 'TEXT', text: args.headerText.trim() });
    }
    if (isMediaHeader(args.headerType) && args.headerMediaStatus !== 'idle') {
      components.push({ type: 'HEADER', format: args.headerType });
    }
  }
  if (args.bodyText.trim()) components.push({ type: 'BODY', text: args.bodyText });
  if (args.buttonsEnabled) {
    const buttons = formattedTemplateButtons(args.templateButtons);
    if (buttons.length > 0) components.push({ type: 'BUTTONS', buttons });
  }
  if (args.footerEnabled && args.footerText.trim()) {
    components.push({ type: 'FOOTER', text: args.footerText.trim() });
  }
  return components;
}

type GenerateUploadUrl = (args: {
  clientId: string;
  mediaType: string;
  filename?: string;
}) => Promise<{ url: string; key: string }>;

type SyncMetadata = (args: { key: string; clientId: string }) => Promise<unknown>;

export async function uploadTemplateHeaderMedia(args: {
  headerEnabled: boolean;
  headerType: HeaderType;
  headerMedia: HeaderMediaState;
  generateUploadUrl: GenerateUploadUrl;
  syncMetadata: SyncMetadata;
  onUploaded: (key: string, mimeType: string) => void;
}) {
  if (!args.headerEnabled || !isMediaHeader(args.headerType)) return args.headerMedia.r2Key;
  if (args.headerMedia.r2Key) return args.headerMedia.r2Key;
  const file = args.headerMedia.pendingFile;
  if (!file) throw new Error('Header media is required.');
  const spec = assertWhatsAppTemplateMediaSpec(file.type);
  if (spec.headerFormat !== args.headerType) {
    throw new Error('Selected file type does not match the header type.');
  }
  const clientId = crypto.randomUUID();
  const { url, key } = await args.generateUploadUrl({
    clientId,
    mediaType: spec.mimeType,
    filename: file.name,
  });
  await uploadWithProgress(url, file);
  await args.syncMetadata({ key, clientId });
  args.onUploaded(key, spec.mimeType);
  return key;
}

export async function buildComponentsForTemplateSubmit(args: {
  headerEnabled: boolean;
  headerType: HeaderType;
  headerText: string;
  headerMedia: HeaderMediaState;
  bodyText: string;
  footerEnabled: boolean;
  footerText: string;
  buttonsEnabled: boolean;
  templateButtons: TemplateButton[];
  generateUploadUrl: GenerateUploadUrl;
  syncMetadata: SyncMetadata;
  onHeaderMediaUploaded: (key: string, mimeType: string) => void;
}): Promise<{ components: TemplateComponent[]; parameterKeys: string[] }> {
  const r2Key = await uploadTemplateHeaderMedia({
    headerEnabled: args.headerEnabled,
    headerType: args.headerType,
    headerMedia: args.headerMedia,
    generateUploadUrl: args.generateUploadUrl,
    syncMetadata: args.syncMetadata,
    onUploaded: args.onHeaderMediaUploaded,
  });
  const bodyComponent = buildTemplateBodyComponent(args.bodyText);
  const components: TemplateComponent[] = [];
  const headerComponent = buildHeaderComponent({
    headerEnabled: args.headerEnabled,
    headerType: args.headerType,
    headerText: args.headerText,
    r2Key,
    filename: args.headerMedia.fileName,
    mimeType: args.headerMedia.fileMime,
  });
  if (headerComponent !== null) components.push(headerComponent);
  components.push(bodyComponent);
  if (args.footerEnabled && args.footerText.trim()) {
    components.push({ type: 'FOOTER', text: args.footerText.trim() });
  }
  if (args.buttonsEnabled) {
    const buttons = formattedTemplateButtons(args.templateButtons);
    if (buttons.length > 0) components.push({ type: 'BUTTONS', buttons });
  }
  return {
    components,
    parameterKeys: extractTemplateParameterKeys(bodyComponent.text),
  };
}
