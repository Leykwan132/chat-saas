import {
  assertWhatsAppTemplateMediaSpec,
  type WhatsAppTemplateMediaMimeType,
} from '../../../shared/whatsappTemplateMedia';
import {
  bodyTextNamedParamsForKeys,
  convertAtParametersToNamedPlaceholders,
  extractTemplateParameterKeys,
  findUnknownTemplateParameters,
} from '../../../shared/whatsappTemplateParameters';
import type {
  HeaderType,
  TemplateBodyComponent,
  TemplateButton,
} from './templateBuilderTypes';

export function buildTemplateBodyComponent(bodyText: string): TemplateBodyComponent {
  const unknown = findUnknownTemplateParameters(bodyText);
  if (unknown.length > 0) {
    throw new Error(`Unknown template parameter: ${unknown.map((key) => `@${key}`).join(', ')}`);
  }

  const normalizedText = convertAtParametersToNamedPlaceholders(bodyText).trim();
  const parameterKeys = extractTemplateParameterKeys(normalizedText);
  const bodyComponent: TemplateBodyComponent = {
    type: 'BODY',
    text: normalizedText,
  };

  if (parameterKeys.length > 0) {
    bodyComponent.example = {
      body_text_named_params: bodyTextNamedParamsForKeys(parameterKeys),
    };
  }

  return bodyComponent;
}

export function buildHeaderComponent(args: {
  headerEnabled: boolean;
  headerType: HeaderType;
  headerText: string;
  r2Key: string | null;
  filename: string | null;
  mimeType: string | null;
}) {
  if (!args.headerEnabled) return null;
  if (args.headerType === 'TEXT') {
    const text = args.headerText.trim();
    return text ? ({ type: 'HEADER', format: 'TEXT', text } as const) : null;
  }
  if (!args.r2Key) return null;
  const spec = assertWhatsAppTemplateMediaSpec(args.mimeType);
  if (spec.headerFormat !== args.headerType) {
    throw new Error('Selected file type does not match the header type.');
  }
  return {
    type: 'HEADER',
    format: spec.headerFormat,
    r2Key: args.r2Key,
    filename: args.filename?.trim() || `template_header.${spec.extension}`,
    mimeType: spec.mimeType as WhatsAppTemplateMediaMimeType,
  } as const;
}

export function formattedTemplateButtons(buttons: TemplateButton[]) {
  return buttons
    .filter((button) => button.text.trim())
    .map((button): TemplateButton => {
      if (button.type === 'QUICK_REPLY') {
        return { type: 'QUICK_REPLY', text: button.text.trim() };
      }
      if (button.type === 'URL') {
        return { type: 'URL', text: button.text.trim(), url: button.url.trim() };
      }
      if (button.type === 'PHONE_NUMBER') {
        return {
          type: 'PHONE_NUMBER',
          text: button.text.trim(),
          phone_number: button.phone_number.trim(),
        };
      }
      return {
        type: 'COPY_CODE',
        text: button.text.trim(),
        example: button.example.trim(),
      };
    });
}
