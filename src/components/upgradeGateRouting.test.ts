import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const workspaceSource = readFileSync(
  new URL('../pages/WorkspacePage.tsx', import.meta.url),
  'utf8',
);
const channelsSource = readFileSync(
  new URL('../pages/ChannelsPage.tsx', import.meta.url),
  'utf8',
);
const widgetSource = readFileSync(
  new URL('./channels/WebWidgetSettingsPanel.tsx', import.meta.url),
  'utf8',
);

describe('paid feature gate routing', () => {
  test('routes entitlement limits through UpgradeModal', () => {
    expect(workspaceSource).toContain('openUpgradeModal();');
    expect(channelsSource).toContain('onLimitReached={openUpgradeModal}');
    expect(widgetSource).toContain('onRequestUpgrade={openUpgradeModal}');
  });
});
