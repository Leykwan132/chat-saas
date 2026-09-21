import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { LandingAppPreviewSidebar } from './LandingAppPreviewSidebar';

test('aligns the workflow preview Kilobot lockup spacing with the app sidebar', () => {
  const markup = renderToStaticMarkup(
    <LandingAppPreviewSidebar
      activeKey="workflow"
      hasSession={false}
      onSignUp={() => undefined}
      onSelect={() => undefined}
    />,
  );

  expect(markup).toContain('gap-[0.45rem]');
  expect(markup).toContain('Kilobot');
});

test('uses the current app sidebar icons and labels in the landing preview', () => {
  const source = readFileSync(new URL('./LandingAppPreviewSidebar.tsx', import.meta.url), 'utf8');

  expect(source).toContain('PiHouse');
  expect(source).toContain('PiGearSix');
  expect(source).toContain('PiFlowArrow');
  expect(source).not.toContain('LayoutDashboard');
  expect(source).not.toContain('Bot');
});
