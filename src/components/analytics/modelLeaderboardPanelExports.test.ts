import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const panelSource = readFileSync(new URL('./ModelLeaderboardPanel.tsx', import.meta.url), 'utf8');

test('model leaderboard panel module exports its loading skeleton', () => {
  expect(panelSource).toContain('export { ModelLeaderboardSkeleton }');
});
