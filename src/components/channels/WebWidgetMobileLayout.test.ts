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

test('public widget stays hidden until ready and fades in from the y axis', () => {
  expect(widgetScript).toContain('opacity:0;translate:0 14px');
  expect(widgetScript).toContain('transition:opacity .28s ease,translate .28s ease');
  expect(widgetScript).toContain('.ready{opacity:1;translate:0 0;visibility:visible');
  expect(widgetScript).toContain(
    'loadConfig().then(loadMessages).then(function () { render(); wrap.classList.add("ready"); }).catch(function () { render(); wrap.classList.add("ready"); })',
  );
});

test('public widget bottom right launcher renders a single icon button', () => {
  expect(widgetScript).toContain('.launcherIcon');
  expect(widgetScript).toContain('.launcher .avatar{width:40px;height:40px;border:0;background:#000;color:#fff}');
  expect(widgetScript).not.toContain('.launcher .avatar{width:24px;height:24px');
  expect(widgetScript).toContain('.launcherIcon{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:0;border-radius:999px;background:#fff;color:#000;box-shadow:none;overflow:hidden;cursor:pointer}');
  expect(widgetScript).not.toContain('.launcherLabel');
  expect(widgetScript).not.toContain('.launcherText');
  expect(widgetScript).not.toContain('Need help?');
  expect(widgetScript).toContain('.layout-right_avatar .panel{right:0;bottom:64px}');
  expect(widgetScript).toContain('.layout-right_avatar .panel,.layout-left_avatar .panel{left:var(--mobile-edge);right:var(--mobile-edge);bottom:76px}');
  expect(widgetScript).not.toContain("<svg viewBox='0 0 24 24'");
  expect(widgetScript).not.toContain("M16 10a2 2 0 0 1-2 2H6.828");
  expect(widgetScript).not.toContain("M5 6.5h10v6H9");
  expect(widgetScript).toContain("<div class='launcher'><button class='launcherIcon' type='button' aria-label='Open chat'><span class='avatar'></span></button></div>");
});
