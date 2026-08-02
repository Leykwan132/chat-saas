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
