import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const leaderboardPage = readFileSync(new URL('./LeaderboardPage.tsx', import.meta.url), 'utf8');
const leaderboardDisplay = readFileSync(
  new URL('../components/analytics/ModelLeaderboardDisplay.tsx', import.meta.url),
  'utf8',
);

test('leaderboard uses the dedicated Tencent color icon for Tencent models', () => {
  for (const source of [leaderboardPage, leaderboardDisplay]) {
    expect(source).toContain('Tencent');
    expect(source).toContain('model.startsWith(\'tencent/\')');
    expect(source).toContain('<Tencent.Color');
  }
});
