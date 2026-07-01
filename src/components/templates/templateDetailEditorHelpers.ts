import {
  buildTemplateBodyComponent,
  formattedTemplateButtons,
} from './buildTemplateComponents';
import type {
  HeaderMediaByType,
  HeaderType,
  TemplateComponent,
  TemplateBodyComponent,
  TemplateButton,
} from './templateBuilderTypes';
import {
  headerMediaByTypeFromMedia,
  headerMediaForType,
  isMediaHeader,
} from './templateHeaderMediaState';
import {
  comparableHeaderMedia,
  headerMediaForComponent,
  headerTypeForComponent,
} from './templateDetailHeaderHelpers';
import {
  assertWhatsAppTemplateMediaSpec,
  whatsappTemplateMediaFilename,
} from '../../../shared/whatsappTemplateMedia';
import { isWhatsAppTemplateParameterKey } from '../../../shared/whatsappTemplateParameters';

export type TemplateDetailComponentInput = {
  type: string;
  format?: string;
  text?: string;
  r2Key?: string;
  previewUrl?: string;
  filename?: string;
  mimeType?: string;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
    text: string;
    url?: string;
    phone_number?: string;
    example?: string;
  }>;
};

export type TemplateDetailFormState = {
  category: string;
  headerEnabled: boolean;
  headerType: HeaderType;
  headerText: string;
  headerMediaByType: HeaderMediaByType;
  bodyText: string;
  footerEnabled: boolean;
  footerText: string;
  buttonsEnabled: boolean;
  buttons: TemplateButton[];
};

export type TemplateDetailUpdateComponent =
  | Extract<TemplateComponent, { type: 'HEADER' }>
  | TemplateBodyComponent
  | { type: 'FOOTER'; text: string }
  | { type: 'BUTTONS'; buttons: TemplateButton[] };

function componentOfType(
  components: TemplateDetailComponentInput[] | null | undefined,
  type: string,
) {
  return components?.find((component) => component.type.toUpperCase() === type) ?? null;
}

function namedPlaceholdersToAtParameters(text: string) {
  return text.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (match, key: string) => {
    return isWhatsAppTemplateParameterKey(key) ? `@${key}` : match;
  });
}

function normalizeButtons(buttons: TemplateDetailComponentInput['buttons']) {
  if (!buttons) return [];
  return buttons.map((button): TemplateButton => {
    if (button.type === 'URL') {
      return { type: 'URL', text: button.text, url: button.url ?? '' };
    }
    if (button.type === 'PHONE_NUMBER') {
      return {
        type: 'PHONE_NUMBER',
        text: button.text,
        phone_number: button.phone_number ?? '',
      };
    }
    if (button.type === 'COPY_CODE') {
      return { type: 'COPY_CODE', text: button.text, example: button.example ?? '' };
    }
    return { type: 'QUICK_REPLY', text: button.text };
  });
}

function normalizeComparableState(state: TemplateDetailFormState) {
  return {
    category: state.category.trim().toUpperCase(),
    headerEnabled: state.headerEnabled,
    headerType: state.headerType,
    headerText:
      state.headerEnabled && state.headerType === 'TEXT'
        ? state.headerText.trim()
        : '',
    headerMedia: comparableHeaderMedia(state),
    bodyText: state.bodyText.trim(),
    footerEnabled: state.footerEnabled,
    footerText: state.footerEnabled ? state.footerText.trim() : '',
    buttonsEnabled: state.buttonsEnabled,
    buttons: state.buttonsEnabled ? formattedTemplateButtons(state.buttons) : [],
  };
}

function buttonsChanged(
  original: TemplateDetailFormState,
  current: TemplateDetailFormState,
) {
  return (
    JSON.stringify(normalizeComparableState(original).buttons) !==
    JSON.stringify(normalizeComparableState(current).buttons)
  );
}

function validateButtons(buttons: TemplateButton[]) {
  buttons.forEach((button) => {
    if (!button.text.trim()) throw new Error('Button text is required.');
    if (button.type === 'URL' && !button.url.trim()) {
      throw new Error('URL button requires a web address.');
    }
    if (button.type === 'PHONE_NUMBER' && !button.phone_number.trim()) {
      throw new Error('Phone button requires a phone number.');
    }
    if (button.type === 'COPY_CODE' && !button.example.trim()) {
      throw new Error('Copy code button requires an example code.');
    }
  });
}

export function templateComponentsToDetailState(args: {
  category: string;
  components: TemplateDetailComponentInput[] | null | undefined;
}): TemplateDetailFormState {
  const header = componentOfType(args.components, 'HEADER');
  const body = componentOfType(args.components, 'BODY');
  const footer = componentOfType(args.components, 'FOOTER');
  const buttons = componentOfType(args.components, 'BUTTONS');
  const normalizedButtons = normalizeButtons(buttons?.buttons);
  const headerEnabled = header !== null;
  const headerType = headerTypeForComponent(header);
  const headerText =
    headerEnabled && headerType === 'TEXT' && header?.text ? header.text : '';
  const footerText = footer?.text ?? '';

  return {
    category: args.category,
    headerEnabled,
    headerType,
    headerText,
    headerMediaByType: headerMediaByTypeFromMedia(
      headerType,
      headerMediaForComponent(header, headerType),
    ),
    bodyText: namedPlaceholdersToAtParameters(body?.text ?? ''),
    footerEnabled: Boolean(footerText.trim()),
    footerText,
    buttonsEnabled: normalizedButtons.length > 0,
    buttons: normalizedButtons.length > 0
      ? normalizedButtons
      : [{ type: 'QUICK_REPLY', text: '' }],
  };
}

export function hasTemplateDetailChanges(
  original: TemplateDetailFormState,
  current: TemplateDetailFormState,
) {
  const before = normalizeComparableState(original);
  const after = normalizeComparableState(current);
  return (
    before.headerEnabled !== after.headerEnabled ||
    before.headerType !== after.headerType ||
    before.headerText !== after.headerText ||
    JSON.stringify(before.headerMedia) !== JSON.stringify(after.headerMedia) ||
    before.bodyText !== after.bodyText ||
    before.footerEnabled !== after.footerEnabled ||
    before.footerText !== after.footerText ||
    before.buttonsEnabled !== after.buttonsEnabled ||
    buttonsChanged(original, current)
  );
}

export function buildChangedTemplateComponents(
  original: TemplateDetailFormState,
  current: TemplateDetailFormState,
): TemplateDetailUpdateComponent[] {
  const before = normalizeComparableState(original);
  const after = normalizeComparableState(current);
  const components: TemplateDetailUpdateComponent[] = [];

  if (
    before.headerEnabled !== after.headerEnabled ||
    before.headerType !== after.headerType ||
    before.headerText !== after.headerText ||
    JSON.stringify(before.headerMedia) !== JSON.stringify(after.headerMedia)
  ) {
    if (!current.headerEnabled) {
      throw new Error('Removing the header is not supported from this page yet.');
    }
    if (current.headerType === 'TEXT') {
      if (!after.headerText) throw new Error('Header text is required when updating the header.');
      components.push({ type: 'HEADER', format: 'TEXT', text: after.headerText });
    } else {
      const media = headerMediaForType(current.headerMediaByType, current.headerType);
      if (media.uploadStatus !== 'ready') {
        throw new Error('Choose a supported header media file before saving.');
      }
      if (!media.r2Key) throw new Error('Header media must finish uploading before saving.');
      const spec = assertWhatsAppTemplateMediaSpec(media.fileMime);
      if (spec.headerFormat !== current.headerType) {
        throw new Error('Selected file type does not match the header type.');
      }
      components.push({
        type: 'HEADER',
        format: spec.headerFormat,
        r2Key: media.r2Key,
        filename: whatsappTemplateMediaFilename(media.fileName, spec.mimeType),
        mimeType: spec.mimeType,
      });
    }
  }

  if (before.bodyText !== after.bodyText) {
    if (!after.bodyText) throw new Error('Main message is required.');
    components.push(buildTemplateBodyComponent(current.bodyText));
  }

  if (
    before.footerEnabled !== after.footerEnabled ||
    before.footerText !== after.footerText
  ) {
    if (!current.footerEnabled) {
      throw new Error('Removing the footer is not supported from this page yet.');
    }
    if (!after.footerText) throw new Error('Footer text is required when updating the footer.');
    components.push({ type: 'FOOTER', text: after.footerText });
  }

  if (
    before.buttonsEnabled !== after.buttonsEnabled ||
    buttonsChanged(original, current)
  ) {
    if (!current.buttonsEnabled) {
      throw new Error('Removing buttons is not supported from this page yet.');
    }
    validateButtons(current.buttons);
    const buttons = formattedTemplateButtons(current.buttons);
    if (buttons.length === 0) {
      throw new Error('Add at least one button or leave buttons unchanged.');
    }
    components.push({ type: 'BUTTONS', buttons });
  }

  return components;
}

export function detailStateToPreviewComponents(state: TemplateDetailFormState) {
  const components: TemplateDetailComponentInput[] = [];

  if (state.headerEnabled && state.headerType === 'TEXT' && state.headerText.trim()) {
    components.push({ type: 'HEADER', format: 'TEXT', text: state.headerText.trim() });
  } else if (state.headerEnabled && isMediaHeader(state.headerType)) {
    const media = headerMediaForType(state.headerMediaByType, state.headerType);
    components.push({
      type: 'HEADER',
      format: state.headerType,
      ...(media.r2Key ? { r2Key: media.r2Key } : {}),
      ...(media.previewUrl ? { previewUrl: media.previewUrl } : {}),
    });
  }

  if (state.bodyText.trim()) {
    components.push({ type: 'BODY', text: state.bodyText });
  }

  if (state.footerEnabled && state.footerText.trim()) {
    components.push({ type: 'FOOTER', text: state.footerText.trim() });
  }

  const buttons = state.buttonsEnabled ? formattedTemplateButtons(state.buttons) : [];
  if (buttons.length > 0) components.push({ type: 'BUTTONS', buttons });

  return components;
}
