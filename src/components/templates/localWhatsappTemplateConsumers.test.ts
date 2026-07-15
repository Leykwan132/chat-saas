import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

const managementSources = [
  '../../../src/pages/TemplatesPage.tsx',
  '../../../src/pages/ChannelWhatsAppTemplatesPage.tsx',
];

const exactDetailSources = [
  '../../../src/pages/TemplateDetailPage.tsx',
  '../../../src/pages/BroadcastDetailPage.tsx',
];

const selectorSources = [
  '../../../src/pages/AutomationsBroadcastPage.tsx',
  '../workflow/workflowWhatsappTemplates.ts',
];

const templateSendSources = [
  '../../../convex/whatsappTemplateSendPayloadBuild.ts',
  '../../../convex/workflowWhatsappTemplateSender.ts',
];

describe('local WhatsApp template consumers', () => {
  test('no frontend consumer reads templates through the Meta list action', () => {
    for (const path of [...managementSources, ...exactDetailSources, ...selectorSources]) {
      expect(source(path)).not.toContain('api.whatsappBroadcast.listTemplates');
    }
  });

  test('management pages subscribe to all local templates', () => {
    for (const path of managementSources) {
      expect(source(path)).toContain('api.whatsappTemplateQueries.listForChannel');
    }
  });

  test('detail pages subscribe to one exact local template', () => {
    for (const path of exactDetailSources) {
      expect(source(path)).toContain(
        'api.whatsappTemplateQueries.getForChannelByNameAndLanguage',
      );
    }
  });

  test('sending selectors subscribe only to approved local templates', () => {
    for (const path of selectorSources) {
      expect(source(path)).toContain(
        'api.whatsappTemplateQueries.listApprovedForChannel',
      );
    }
  });

  test('template creation uses the local-first mutation', () => {
    for (const path of managementSources.slice(1).concat(
      '../../../src/pages/AutomationsBroadcastPage.tsx',
    )) {
      expect(source(path)).toContain('api.whatsappTemplates.createLocalTemplate');
      expect(source(path)).not.toContain('api.whatsappBroadcast.createTemplate');
    }
  });

  test('management pages have no manual refresh control', () => {
    for (const path of managementSources) {
      expect(source(path)).not.toMatch(/Refresh(?: list)?/);
    }
  });

  test('template sending emits no routine or message-content console logs', () => {
    for (const path of templateSendSources) {
      expect(source(path)).not.toContain('console.log');
    }
  });
});
