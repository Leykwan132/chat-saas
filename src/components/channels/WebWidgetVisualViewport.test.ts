import { expect, test } from 'vitest';
import widgetScript from '../../../public/widget/v1.js?raw';

test('public widget synchronizes mobile geometry with VisualViewport events', () => {
  expect(widgetScript).toContain('window.visualViewport.addEventListener("resize", scheduleVisualViewportSync, { passive: true })');
  expect(widgetScript).toContain('window.visualViewport.addEventListener("scroll", scheduleVisualViewportSync, { passive: true })');
  expect(widgetScript).toContain('window.addEventListener("orientationchange", scheduleVisualViewportSync)');
  expect(widgetScript).toContain('window.requestAnimationFrame(syncVisualViewport)');
});

test('public widget publishes clamped visual viewport edge offsets', () => {
  expect(widgetScript).toContain('function syncVisualViewport()');
  expect(widgetScript).toContain('Math.max(0, viewport.offsetTop)');
  expect(widgetScript).toContain('Math.max(0, viewport.offsetLeft)');
  expect(widgetScript).toContain('Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height)');
  expect(widgetScript).toContain('Math.max(0, window.innerWidth - viewport.offsetLeft - viewport.width)');
  expect(widgetScript).toContain('wrap.style.setProperty("--mobile-viewport-top", top + "px")');
  expect(widgetScript).toContain('wrap.style.setProperty("--mobile-viewport-bottom", bottom + "px")');
  expect(widgetScript).toContain('wrap.style.setProperty("--mobile-viewport-left", left + "px")');
  expect(widgetScript).toContain('wrap.style.setProperty("--mobile-viewport-right", right + "px")');
});

test('public widget schedules viewport synchronization when native inputs focus', () => {
  expect(widgetScript).toContain('barInput.addEventListener("focus", handleBarInputFocus)');
  expect(widgetScript).toContain('panelInput.addEventListener("focus", scheduleVisualViewportSync)');
  expect(widgetScript).toContain('function handleBarInputFocus() { openPanel(); scheduleVisualViewportSync(); }');
});

test('public widget mobile layout combines viewport offsets with safe areas', () => {
  expect(widgetScript).toContain('--mobile-viewport-top:0px');
  expect(widgetScript).toContain('--mobile-viewport-bottom:0px');
  expect(widgetScript).toContain('--mobile-viewport-left:0px');
  expect(widgetScript).toContain('--mobile-viewport-right:0px');
  expect(widgetScript).toContain('env(safe-area-inset-top,0px)');
  expect(widgetScript).toContain('env(safe-area-inset-bottom,0px)');
  expect(widgetScript).toContain('env(safe-area-inset-left,0px)');
  expect(widgetScript).toContain('env(safe-area-inset-right,0px)');
  expect(widgetScript).toContain('@media(max-width:480px),(max-height:480px) and (pointer:coarse)');
  expect(widgetScript).toContain('max-height:calc(100dvh - var(--mobile-edge) - var(--mobile-edge) - var(--mobile-bar-height) - var(--mobile-panel-gap))');
});

test('input-bar panel overrides the desktop bottom offset on mobile', () => {
  expect(widgetScript).toContain(
    '.layout-input_bar .panel{left:calc(var(--mobile-viewport-left) + max(var(--mobile-edge),env(safe-area-inset-left,0px)));right:calc(var(--mobile-viewport-right) + max(var(--mobile-edge),env(safe-area-inset-right,0px)));bottom:calc(var(--mobile-viewport-bottom) + max(var(--mobile-edge),env(safe-area-inset-bottom,0px)) + var(--mobile-bar-height) + var(--mobile-panel-gap));--panel-x:0}',
  );
});

test('public widget native inputs expose mobile keyboard and accessibility hints', () => {
  expect(widgetScript.match(/<input aria-label='Message' autocomplete='off' inputmode='text' enterkeyhint='send'\/>/g)).toHaveLength(2);
  expect(widgetScript).toContain('@media(max-width:480px)');
  expect(widgetScript).toContain('input{font-size:16px}');
});

test('visual viewport support does not add a containing-block trigger to the wrapper', () => {
  expect(widgetScript).toContain('.ready{opacity:1;visibility:visible;transition-delay:0s}');
  expect(widgetScript).not.toContain('.wrap{transform:');
  expect(widgetScript).not.toContain('.wrap{translate:');
  expect(widgetScript).not.toContain('.wrap{filter:');
  expect(widgetScript).not.toContain('.wrap{contain:');
});
