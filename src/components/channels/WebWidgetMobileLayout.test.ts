import { expect, test } from 'vitest';
import widgetScript from '../../../public/widget/v1.js?raw';

test('public widget mobile layout keeps the expanded panel separated from the input bar', () => {
  expect(widgetScript).toContain('.wrap,.wrap *{box-sizing:border-box}');
  expect(widgetScript).toContain('--mobile-panel-gap:22px');
  expect(widgetScript).toContain('@media(max-width:480px)');
  expect(widgetScript).toContain(
    'bottom:calc(var(--mobile-edge) + var(--mobile-bar-height) + var(--mobile-panel-gap))',
  );
  expect(widgetScript).toContain(
    'max-height:calc(100dvh - var(--mobile-edge) - var(--mobile-edge) - var(--mobile-bar-height) - var(--mobile-panel-gap))',
  );
});

test('public widget expanded header uses centered icon treatment', () => {
  expect(widgetScript).toContain(
    '.close{display:flex;align-items:center;justify-content:center;width:32px;height:32px',
  );
  expect(widgetScript).toContain(
    "<button class='close' type='button' aria-label='Close chat'><svg",
  );
  expect(widgetScript).toContain('.fallbackIcon{padding:3px;object-fit:contain}');
});
