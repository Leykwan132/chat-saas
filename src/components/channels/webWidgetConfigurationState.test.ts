import { describe, expect, test } from 'vitest';
import {
  canSendWebWidgetPreview,
  getTraditionalWidgetFormState,
  getWebWidgetPreviewQueryArgs,
  getWebWidgetPreviewState,
} from './webWidgetConfigurationState';

describe('AI widget preview state', () => {
  test('skips message access and explains activation while Traditional is active', () => {
    expect(getWebWidgetPreviewState('traditional')).toEqual({
      enabled: false,
      inactiveMessage: 'Set AI-powered as the active widget to use the live preview.',
    });
    expect(getWebWidgetPreviewQueryArgs(false, 'pub_key', 'visitor-id')).toBe('skip');
    expect(
      canSendWebWidgetPreview({ enabled: false, content: 'Hello', sending: false }),
    ).toBe(false);
  });

  test('enables message access and sending while AI-powered is active', () => {
    expect(getWebWidgetPreviewState('ai_powered')).toEqual({
      enabled: true,
      inactiveMessage: null,
    });
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
        activeMode: 'ai_powered',
        busy: false,
        canPublish: true,
        draft: { ...saved, label: 'Talk to us' },
        saved,
      }),
    ).toEqual({ valid: true, dirty: true, canSave: true, canActivate: false });
  });

  test('allows saved valid settings to publish only when not already active', () => {
    expect(
      getTraditionalWidgetFormState({
        activeMode: 'ai_powered',
        busy: false,
        canPublish: true,
        draft: saved,
        saved,
      }),
    ).toEqual({ valid: true, dirty: false, canSave: false, canActivate: true });
    expect(
      getTraditionalWidgetFormState({
        activeMode: 'traditional',
        busy: false,
        canPublish: true,
        draft: saved,
        saved,
      }).canActivate,
    ).toBe(false);
  });

  test('rejects blank and overlong drafts', () => {
    expect(
      getTraditionalWidgetFormState({
        activeMode: 'ai_powered',
        busy: false,
        canPublish: true,
        draft: { ...saved, label: ' ' },
        saved,
      }).valid,
    ).toBe(false);
    expect(
      getTraditionalWidgetFormState({
        activeMode: 'ai_powered',
        busy: false,
        canPublish: true,
        draft: { ...saved, prefillMessage: 'x'.repeat(501) },
        saved,
      }).valid,
    ).toBe(false);
  });
});
