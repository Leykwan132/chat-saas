export type TraditionalWidgetValues = {
  label: string;
  prefillMessage: string;
  hidePoweredBy: boolean;
};

export function getWebWidgetPreviewQueryArgs(
  enabled: boolean,
  publicKey: string,
  visitorId: string,
) {
  return enabled ? { publicKey, visitorId } : ('skip' as const);
}

export function canSendWebWidgetPreview(args: {
  enabled: boolean;
  content: string;
  sending: boolean;
}) {
  return args.enabled && !args.sending && args.content.trim().length > 0;
}

function normalizeTraditionalWidgetValues(values: TraditionalWidgetValues) {
  return {
    label: values.label.trim(),
    prefillMessage: values.prefillMessage.trim(),
    hidePoweredBy: values.hidePoweredBy,
  };
}

export function getTraditionalWidgetFormState(args: {
  busy: boolean;
  draft: TraditionalWidgetValues;
  saved: TraditionalWidgetValues;
}) {
  const draft = normalizeTraditionalWidgetValues(args.draft);
  const saved = normalizeTraditionalWidgetValues(args.saved);
  const valid =
    draft.label.length >= 1 &&
    draft.label.length <= 40 &&
    draft.prefillMessage.length >= 1 &&
    draft.prefillMessage.length <= 500;
  const dirty =
    draft.label !== saved.label ||
    draft.prefillMessage !== saved.prefillMessage ||
    draft.hidePoweredBy !== saved.hidePoweredBy;

  return {
    valid,
    dirty,
    canSave: valid && dirty && !args.busy,
  };
}
