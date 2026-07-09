import { expect, test } from 'vitest';
import { buildWebWidgetSnippet } from './webWidgetSnippet';
import widgetScript from '../../../public/widget/v1.js?raw';

test('web widget install snippet only exposes the script URL and public widget key', () => {
  expect(buildWebWidgetSnippet('pub_test')).toBe(`<script
  async
  src="https://kilobot.app/widget/v1.js"
  data-kilobot-widget="pub_test"
></script>`);
});

test('public widget runtime keeps data-kilobot-api as an optional override', () => {
  expect(widgetScript).toContain(
    'script.getAttribute("data-kilobot-api") || "https://outstanding-rabbit-215.convex.site"',
  );
});
