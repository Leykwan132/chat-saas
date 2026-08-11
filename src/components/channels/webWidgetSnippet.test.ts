import { expect, test } from 'vitest';
import { buildWebWidgetSnippet } from './webWidgetSnippet';
import widgetScript from '../../../public/widget/v1.js?raw';

test('builds a mode-specific AI-powered installation snippet', () => {
  expect(buildWebWidgetSnippet('pub_test', 'ai_powered')).toBe(`<script
  async
  src="https://kilobot.app/widget/v1.js"
  data-kilobot-widget="pub_test"
  data-kilobot-mode="ai-powered"
></script>`);
});

test('builds a mode-specific Traditional installation snippet', () => {
  expect(buildWebWidgetSnippet('pub_test', 'traditional')).toContain(
    'data-kilobot-mode="traditional"',
  );
});

test('public widget runtime keeps data-kilobot-api as an optional override', () => {
  expect(widgetScript).toContain(
    'script.getAttribute("data-kilobot-api") || "https://outstanding-rabbit-215.convex.site"',
  );
});

test('public widget runtime requests and loads the snippet-selected mode', () => {
  expect(widgetScript).toContain('script.getAttribute("data-kilobot-mode")');
  expect(widgetScript).toContain('url.searchParams.set("mode", mode)');
  expect(widgetScript).toContain('loadRuntime(mode === "traditional" ? "traditional" : "ai"');
  expect(widgetScript).toContain('if (widgetLoads[publicKey]) return');
});
