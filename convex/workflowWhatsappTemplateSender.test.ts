import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const source = readFileSync(
  new URL('./workflowWhatsappTemplateSender.ts', import.meta.url),
  'utf8',
);

test('returns the resolved content and media produced for the provider payload', () => {
  expect(source).toContain('buildWhatsAppTemplateSendPayloadWithContent');
  expect(source).toContain('renderedContent');
  expect(source).toContain('headerAsset');
});
