import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

test('openUpgradeModal ignores non-scenario click-event arguments', () => {
  const source = readFileSync(new URL('./UpgradeModal.tsx', import.meta.url), 'utf8');
  const cardSource = readFileSync(
    new URL('./channels/AvailableChannelCard.tsx', import.meta.url),
    'utf8',
  );

  expect(source).toContain('scenario in UPGRADE_SCENARIOS');
  expect(source).toContain(
    'UPGRADE_SCENARIOS[activeScenario] ?? UPGRADE_SCENARIOS.free_to_starter',
  );
  expect(cardSource).toContain('onClick={() => onLimitReached?.()}');
});
