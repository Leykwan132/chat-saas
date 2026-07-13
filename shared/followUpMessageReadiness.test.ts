import { describe, expect, test } from 'vitest';
import {
  FOLLOW_UP_MESSAGE_REQUIRED_ERROR,
  hasCompleteFollowUpMessages,
} from './followUpMessageReadiness';

describe('follow-up message readiness', () => {
  test('uses the approved activation error copy', () => {
    expect(FOLLOW_UP_MESSAGE_REQUIRED_ERROR).toBe('You need to select a message first.');
  });

  test('requires at least one selected message', () => {
    expect(hasCompleteFollowUpMessages([])).toBe(false);
    expect(hasCompleteFollowUpMessages([{ templateName: '' }])).toBe(false);
    expect(hasCompleteFollowUpMessages([{ templateName: '   ' }])).toBe(false);
  });

  test('accepts a complete shared-message configuration', () => {
    expect(hasCompleteFollowUpMessages([{ templateName: 'follow_up_en' }])).toBe(true);
  });

  test('rejects a different-message configuration with any missing template', () => {
    expect(hasCompleteFollowUpMessages([
      { templateName: 'first' },
      { templateName: '' },
      { templateName: 'third' },
    ])).toBe(false);
  });

  test('accepts a different-message configuration when every attempt is selected', () => {
    expect(hasCompleteFollowUpMessages([
      { templateName: 'first' },
      { templateName: 'second' },
    ])).toBe(true);
  });
});
