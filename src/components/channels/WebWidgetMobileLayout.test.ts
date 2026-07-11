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
  expect(widgetScript).toContain('.agent{display:flex;align-items:center;gap:10px;min-width:0;font-size:14px;font-weight:400}');
  expect(widgetScript).toContain('.fallbackIcon{padding:0;object-fit:contain}');
  expect(widgetScript).not.toContain('.agent{display:flex;align-items:center;gap:10px;min-width:0;font-size:14px;font-weight:650}');
  expect(widgetScript).not.toContain('.fallbackIcon{padding:3px;object-fit:contain}');
});

test('public widget fades in without translating the fixed panel wrapper', () => {
  expect(widgetScript).toContain(
    'pointer-events:none;opacity:0;visibility:hidden;transition:opacity .28s ease,visibility 0s .28s',
  );
  expect(widgetScript).toContain('.ready{opacity:1;visibility:visible;transition-delay:0s}');
  expect(widgetScript).not.toContain('opacity:0;translate:');
  expect(widgetScript).not.toContain('.ready{opacity:1;translate:');
  expect(widgetScript).not.toContain('transition:opacity .28s ease,translate');
  expect(widgetScript).toContain(
    'loadConfig().then(loadMessages).then(function () { render(); wrap.classList.add("ready"); }).catch(function () { render(); wrap.classList.add("ready"); })',
  );
});

test('public widget bottom right launcher renders a single icon button', () => {
  expect(widgetScript).toContain('.launcherIcon');
  expect(widgetScript).toContain('.launcher .avatar{width:48px;height:48px;border:0;background:#000;color:#fff}');
  expect(widgetScript).not.toContain('.launcher .avatar{width:40px;height:40px');
  expect(widgetScript).not.toContain('.launcher .avatar{width:24px;height:24px');
  expect(widgetScript).toContain('background:#fff;padding:5px;box-shadow:0 4px 12px');
  expect(widgetScript).toContain('.launcherIcon{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border:0;border-radius:999px;background:#fff;color:#000;box-shadow:none;overflow:hidden;cursor:pointer}');
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

test('public widget reset starts a fresh local visitor thread', () => {
  expect(widgetScript).toContain("aria-label='Reset chat'");
  expect(widgetScript).toContain("M8.5 5.2A5.7 5.7 0 1 1 5 10.4");
  expect(widgetScript).toContain("M4.2 4.3v3.2h3.2");
  expect(widgetScript).not.toContain("M3.8 10a6.2 6.2 0 1 0 2-4.55");
  expect(widgetScript).not.toContain("M6.5 6.5A5 5 0 1 1 5 10.1M5 5v4h4");
  expect(widgetScript).toContain('function resetChat()');
  expect(widgetScript).toContain('visitorId = createVisitorId()');
  expect(widgetScript).toContain('storeVisitorId(visitorId)');
  expect(widgetScript).toContain('state.messages = []');
});

test('public widget reset asks for confirmation before clearing the thread', () => {
  expect(widgetScript).toContain("class='resetOverlay'");
  expect(widgetScript).toContain("role='dialog'");
  expect(widgetScript).toContain("aria-label='Confirm clear conversation'");
  expect(widgetScript).toContain('function requestResetChat()');
  expect(widgetScript).toContain('reset.addEventListener("click", requestResetChat)');
  expect(widgetScript).not.toContain('reset.addEventListener("click", resetChat)');
  expect(widgetScript).toContain('resetOverlay.addEventListener("click", dismissResetDialog)');
  expect(widgetScript).toContain('confirmReset.addEventListener("click", resetChat)');
  expect(widgetScript).toContain('function dismissResetDialog(event)');
  expect(widgetScript).toContain('if (event.target !== resetOverlay) return');
  expect(widgetScript).toContain('resetOverlay.hidden = !state.resetOpen');
});

test('public widget reset confirmation uses a blur-only overlay and normal text weight', () => {
  expect(widgetScript).toContain('.resetOverlay{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;padding:18px;background:transparent;backdrop-filter:blur(8px)');
  expect(widgetScript).not.toContain('.resetOverlay{position:absolute;inset:56px 0 0');
  expect(widgetScript).not.toContain('background:rgba(17,24,39,.32)');
  expect(widgetScript).not.toContain('padding:18px;background:var(--panel-bg);backdrop-filter');
  expect(widgetScript).not.toContain('.resetTitle{font-size:15px;font-weight:700');
  expect(widgetScript).not.toContain('font-weight:650;cursor:pointer');
  expect(widgetScript).toContain('.resetTitle{font-size:15px;font-weight:400');
  expect(widgetScript).toContain('font-weight:400;cursor:pointer');
});

test('public widget renders media inline instead of a generic attachment link', () => {
  expect(widgetScript).toContain('function mediaHtml(message)');
  expect(widgetScript).toContain('function visibleMediaCaption(message)');
  expect(widgetScript).toContain('captionText = visibleMediaCaption(message)');
  expect(widgetScript).toContain('captionText ? "<div class=\'caption\'>" + formatText(captionText) + "</div>" : ""');
  expect(widgetScript).toContain('var url = escapeHtml(message.mediaUrl || "")');
  expect(widgetScript).toContain('content === mediaUrl || isUrlOnly(content)');
  expect(widgetScript).toContain('function isUrlOnly(value)');
  expect(widgetScript).toContain("<img class='media mediaImage'");
  expect(widgetScript).toContain("<video class='media mediaVideo' controls");
  expect(widgetScript).toContain("<audio class='media mediaAudio' controls");
  expect(widgetScript).toContain("<iframe class='media mediaFrame'");
  expect(widgetScript).toContain("title='File preview'");
  expect(widgetScript).toContain(".mediaFrame{width:160px;aspect-ratio:9/16;height:auto;border-radius:0");
  expect(widgetScript).toContain(".fileRow{display:flex;max-width:100%;align-items:center;gap:10px}");
  expect(widgetScript).toContain("class='fileRow'");
  expect(widgetScript).toContain("class='fileOpen'");
  expect(widgetScript).toContain("aria-label='Open file'");
  expect(widgetScript).toContain("M7 7h6m0 0v6m0-6L6 14");
  expect(widgetScript).not.toContain("class='fileHead'");
  expect(widgetScript).not.toContain("Document preview");
  expect(widgetScript).not.toContain("function fileNameFromUrl(url)");
  expect(widgetScript).not.toContain(">Open file</a>");
  expect(widgetScript).not.toContain(">Attachment</a>");
});

test('public widget omits assistant avatars from completed messages and thinking rows', () => {
  expect(widgetScript).toContain(
    'return "<div class=\'agentMsg\'><div class=\'" + cls + "\'>" + body + "</div></div>"',
  );
  expect(widgetScript).not.toContain(
    'return "<div class=\'agentMsg\'><span class=\'msgAvatar\'>" + assistantAvatarHtml()',
  );
  expect(widgetScript).not.toContain("class='msgAvatar loading'");
  expect(widgetScript).not.toContain("assistantAvatarHtml() + \"</span><div class='msg out'><span class='shimmer'>Thinking...</span>");
});

test('public widget thinking text uses a white gray shimmer gradient', () => {
  expect(widgetScript).toContain('linear-gradient(135deg,#ffffff,#5E5E5E,#ffffff)');
  expect(widgetScript).toContain('background-size:200% 100%');
  expect(widgetScript).toContain('animation:kilobot-shimmer 5s linear infinite');
  expect(widgetScript).toContain('@keyframes kilobot-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}');
  expect(widgetScript).toContain('return "<div class=\'agentMsg thinking\'><div class=\'msg out\'><span class=\'shimmer\'>Thinking...</span></div></div>"');
});

test('public widget uses wider message spacing and solid dark user bubbles', () => {
  expect(widgetScript).toContain('.msgs{display:flex;flex:1;flex-direction:column;gap:16px');
  expect(widgetScript).toContain('.in{align-self:flex-end;max-width:85%;border:0;border-radius:16px;background:#3f403c;color:#fff;box-shadow:none');
  expect(widgetScript).not.toContain('border-radius:10px;background:#3f403c');
  expect(widgetScript).not.toContain('background:var(--in-bg);color:var(--in-text);box-shadow:0 1px 2px');
  expect(widgetScript).not.toContain('border:1px solid rgba(255,255,255,.15)');
});

test('public widget provides a centered scroll-to-latest button when scrolled up', () => {
  expect(widgetScript).toContain("class='scrollDown'");
  expect(widgetScript).toContain("aria-label='Scroll to latest message'");
  expect(widgetScript).toContain('.scrollDown{position:absolute;left:50%;bottom:68px');
  expect(widgetScript).toContain('.layout-input_bar .scrollDown{bottom:18px}');
  expect(widgetScript).toContain('messagesEl.addEventListener("scroll", updateScrollButton)');
  expect(widgetScript).toContain('scrollDown.addEventListener("click", scrollToBottom)');
  expect(widgetScript).toContain('function updateScrollButton()');
  expect(widgetScript).toContain('function scrollToBottom()');
});

test('public widget does not rebuild unchanged message media on polling renders', () => {
  expect(widgetScript).toContain('renderedMessagesHtml: ""');
  expect(widgetScript).toContain('function renderMessages()');
  expect(widgetScript).toContain('var nextHtml = state.messages.map(messageHtml).join("") + thinkingHtml()');
  expect(widgetScript).toContain('if (nextHtml === state.renderedMessagesHtml) return');
  expect(widgetScript).toContain('state.renderedMessagesHtml = nextHtml');
  expect(widgetScript).toContain('messagesEl.innerHTML = nextHtml');
  expect(widgetScript).toContain('renderMessages()');
  expect(widgetScript).not.toContain('messagesEl.innerHTML = state.messages.map(messageHtml).join("") + thinkingHtml()');
});

test('public widget reveals newly arrived assistant text with a streaming effect', () => {
  expect(widgetScript).toContain('streamTimers');
  expect(widgetScript).toContain('function visibleAssistantText(message)');
  expect(widgetScript).toContain('startAssistantStream(message)');
  expect(widgetScript).toContain("class='streamCursor'");
});

test('public widget keeps the thinking row visible while a later reply is pending', () => {
  expect(widgetScript).toContain('awaitingSince: 0');
  expect(widgetScript).toContain('pendingIncoming: null');
  expect(widgetScript).toContain('state.awaitingSince = sentAt');
  expect(widgetScript).toContain('state.pendingIncoming = pending');
  expect(widgetScript).toContain('mergePendingIncoming(data.messages || state.messages)');
  expect(widgetScript).toContain('mergePendingIncoming(data.messages || [])');
  expect(widgetScript).toContain('function hasFreshAssistantReply(messages)');
  expect(widgetScript).toContain('function mergePendingIncoming(messages)');
  expect(widgetScript).toContain('if (!state.awaitingReply) return');
  expect(widgetScript).not.toContain('if (latest && latest.direction === "outgoing") state.awaitingReply = false');
});

test('public widget renders WhatsApp-style single-asterisk bold safely', () => {
  expect(widgetScript).toContain('function formatText(value)');
  expect(widgetScript).toContain('escapeHtml(value).replace(/\\*([^*\\n][^*\\n]*?)\\*/g');
  expect(widgetScript).toContain('"<strong>" + text + "</strong>"');
  expect(widgetScript).toContain('formatText(message.content || "")');
  expect(widgetScript).toContain('formatText(visible)');
  expect(widgetScript).toContain('if (message.mediaUrl || !full) return formatText(full)');
  expect(widgetScript).toContain('"<div class=\'caption\'>" + formatText(captionText) + "</div>"');
  expect(widgetScript).not.toContain('escapeHtml(visible) + (visible.length < full.length');
});

test('public widget compacts the closed input bar while the host page scrolls', () => {
  expect(widgetScript).toContain('pageScrolling: false');
  expect(widgetScript).toContain('pageScrollTimer: 0');
  expect(widgetScript).toContain(
    'window.addEventListener("scroll", handlePageScroll, { capture: true, passive: true })',
  );
  expect(widgetScript).toContain('function handlePageScroll()');
  expect(widgetScript).toContain('state.open || root.activeElement === barInput');
  expect(widgetScript).toContain('window.setTimeout(function ()');
  expect(widgetScript).toContain('}, 180)');
  expect(widgetScript).toContain('function clearPageScrolling()');
  expect(widgetScript).toContain('(state.pageScrolling ? " page-scrolling" : "")');
  expect(widgetScript).toContain(
    '.page-scrolling.layout-input_bar:not(.open):not(:focus-within) .bar{width:132px;height:40px',
  );
  expect(widgetScript).toContain(
    '.page-scrolling.layout-input_bar:not(.open):not(:focus-within) .bar .send{width:30px;height:30px}',
  );
  expect(widgetScript).toContain(
    '@media(prefers-reduced-motion:reduce){.bar,.bar .send{transition:none}}',
  );
});
