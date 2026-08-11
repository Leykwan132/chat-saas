import { describe, expect, test } from 'vitest';
import {
  canSendWebWidgetPreview,
  getTraditionalWidgetFormState,
  getWebWidgetPreviewQueryArgs,
} from './webWidgetConfigurationState';

describe('AI widget preview state', () => {
  test('skips message access when explicitly disabled', () => {
    expect(getWebWidgetPreviewQueryArgs(false, 'pub_key', 'visitor-id')).toBe('skip');
    expect(
      canSendWebWidgetPreview({ enabled: false, content: 'Hello', sending: false }),
    ).toBe(false);
  });

  test('enables message access and sending', () => {
    expect(getWebWidgetPreviewQueryArgs(true, 'pub_key', 'visitor-id')).toEqual({
      publicKey: 'pub_key',
      visitorId: 'visitor-id',
    });
    expect(
      canSendWebWidgetPreview({ enabled: true, content: ' Hello ', sending: false }),
    ).toBe(true);
  });
});

describe('Traditional widget form state', () => {
  const saved = {
    label: 'Chat with us',
    prefillMessage: 'Hello team',
    hidePoweredBy: false,
  };

  test('allows valid changed settings to save without publishing them', () => {
    expect(
      getTraditionalWidgetFormState({
        busy: false,
        draft: { ...saved, label: 'Talk to us' },
        saved,
      }),
    ).toEqual({ valid: true, dirty: true, canSave: true });
  });

  test('rejects blank and overlong drafts', () => {
    expect(
      getTraditionalWidgetFormState({
        busy: false,
        draft: { ...saved, label: ' ' },
        saved,
      }).valid,
    ).toBe(false);
    expect(
      getTraditionalWidgetFormState({
        busy: false,
        draft: { ...saved, prefillMessage: 'x'.repeat(501) },
        saved,
      }).valid,
    ).toBe(false);
  });
});
