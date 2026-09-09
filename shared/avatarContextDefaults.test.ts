import { expect, test } from 'vitest';
import {
  DEFAULT_AVATAR_OPENING_TEXT,
  buildDefaultAvatarInstructions,
} from './avatarContextDefaults';

test('fills business placeholders in the default Avatar instructions', () => {
  const prompt = buildDefaultAvatarInstructions({
    businessName: 'Acme Flowers',
    businessDescription: 'We deliver same-day bouquets.',
  });

  expect(DEFAULT_AVATAR_OPENING_TEXT).toBe('Hello, how can I help you.');
  expect(prompt).toContain('You are a live AI representative for Acme Flowers.');
  expect(prompt).toContain('We deliver same-day bouquets.');
  expect(prompt).not.toContain('{{business_name}}');
  expect(prompt).not.toContain('{{business_description}}');
});
