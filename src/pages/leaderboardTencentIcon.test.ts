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

test('supported model cards use a configured custom image', () => {
  expect(leaderboardPage).toContain('imageUrl?: string');
  expect(leaderboardPage).toContain('src={imageUrl}');
  expect(leaderboardPage).toContain(
    '<ModelLogo model={model.value} imageUrl={model.imageUrl}',
  );
});

test('ranking rows use supported model chef and custom image', () => {
  expect(leaderboardDisplay).toContain('imageUrl?: string');
  expect(leaderboardDisplay).toContain('src={imageUrl}');

  const panelSource = readFileSync(
    new URL('../components/analytics/ModelLeaderboardPanel.tsx', import.meta.url),
    'utf8',
  );
  expect(panelSource).toContain('getModelChef');
  expect(panelSource).toContain('getModelImageUrl');
  expect(panelSource).toContain('<ModelLogo model={item.model} imageUrl={imageUrl} />');
  expect(panelSource).not.toContain("parts.length > 1 ? parts[0] : 'openrouter'");
});
