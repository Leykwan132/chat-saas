(function () {
  var script = document.currentScript;
  if (!script) return;

  var publicKey = script.getAttribute("data-kilobot-widget") || "";
  var apiBase = (script.getAttribute("data-kilobot-api") || "https://outstanding-rabbit-215.convex.site").replace(/\/+$/, "");
  if (!publicKey || !apiBase) return;

  var fallbackIconUrl = fallbackIcon();
  var storageKey = "kilobot:widget:" + publicKey + ":visitorId";
  var visitorId = readVisitorId();
  var streamTimers = {};
  var state = {
    config: { agentDisplayName: "AI Agent", layout: "input_bar", placeholder: "What can AI Agent help with?", theme: "light", poweredBy: true },
    messages: [],
    open: false,
    sending: false,
    awaitingReply: false,
    awaitingSince: 0,
    pendingIncoming: null,
    resetOpen: false,
    pollTimer: 0,
    pageScrolling: false,
    pageScrollTimer: 0,
    renderedMessagesHtml: "",
    streamText: {},
  };

  var host = document.createElement("div");
  host.setAttribute("data-kilobot-root", publicKey);
  document.documentElement.appendChild(host);
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML = [
    "<style>",
    ":host{all:initial;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827}",
    ".wrap{position:fixed;bottom:18px;z-index:2147483647;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .28s ease,visibility 0s .28s;--panel-bg:rgba(139,140,134,.82);--panel-text:#fff;--panel-border:rgba(255,255,255,.2);--header-bg:transparent;--muted:rgba(255,255,255,.7);--assistant:rgba(255,255,255,.92);--in-bg:rgba(255,255,255,.16);--in-text:#fff;--avatar-bg:rgba(255,255,255,.12);--avatar-text:#fff;--composer-bg:rgba(255,255,255,.92);--composer-text:#111827;--composer-border:rgba(17,24,39,.08);--composer-placeholder:#a5abb5;--send-bg:#e5e7eb;--send-text:#111827;--send-hover:#d1d5db;--launcher-bg:#fff;--launcher-text:#111827;--shine1:rgba(255,255,255,.16);--shine2:rgba(255,255,255,.07);--mobile-edge:12px;--mobile-bar-height:48px;--mobile-panel-gap:22px;--mobile-input-lift:8px;--mobile-viewport-top:0px;--mobile-viewport-bottom:0px;--mobile-viewport-left:0px;--mobile-viewport-right:0px}",
    ".ready{opacity:1;visibility:visible;transition-delay:0s}.wrap,.wrap *{box-sizing:border-box}",
    ".theme-dark{--panel-bg:rgba(139,140,134,.82);--panel-text:#fff;--panel-border:rgba(255,255,255,.2);--header-bg:transparent;--muted:rgba(255,255,255,.7);--assistant:rgba(255,255,255,.92);--in-bg:rgba(255,255,255,.16);--in-text:#fff;--avatar-bg:rgba(255,255,255,.12);--avatar-text:#fff;--composer-bg:#000;--composer-text:#fff;--composer-border:rgba(255,255,255,.12);--composer-placeholder:rgba(255,255,255,.42);--send-bg:#fff;--send-text:#000;--send-hover:rgba(255,255,255,.86);--launcher-bg:#000;--launcher-text:#fff;--shine1:rgba(255,255,255,.16);--shine2:rgba(255,255,255,.07)}",
    ".layout-input_bar{left:50%;transform:translateX(-50%);width:min(92vw,430px)}.layout-right_avatar{right:18px;width:min(92vw,430px)}.layout-left_avatar{left:18px;width:min(92vw,430px)}",
    ".panel{position:absolute;display:flex;flex-direction:column;width:min(92vw,430px);height:min(70vh,474px);overflow:hidden;border:1px solid var(--panel-border);border-radius:24px;background:var(--panel-bg);color:var(--panel-text);box-shadow:0 8px 24px rgba(0,0,0,.16);backdrop-filter:blur(18px);pointer-events:none;opacity:0;transform:translate(var(--panel-x,0),32px);transition:opacity .28s ease-in-out,transform .3s ease-in-out}.panel:before{content:'';position:absolute;left:0;right:0;top:0;height:96px;background:linear-gradient(180deg,var(--shine1),var(--shine2),transparent);pointer-events:none}",
    ".layout-input_bar .panel{left:50%;bottom:64px;--panel-x:-50%}.layout-right_avatar .panel{right:0;bottom:64px}.layout-left_avatar .panel{left:0;bottom:64px}.open .panel{pointer-events:auto;opacity:1;transform:translate(var(--panel-x,0),0)}",
    ".head,.msgs,.panelForm,.power{position:relative;z-index:1}.head{display:flex;align-items:center;justify-content:space-between;min-height:56px;background:var(--header-bg);padding:12px 16px}.agent{display:flex;align-items:center;gap:10px;min-width:0;font-size:14px;font-weight:400}.headActions{display:flex;align-items:center;gap:4px}",
    ".avatar{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid var(--panel-border);border-radius:999px;background:var(--avatar-bg);color:var(--avatar-text);overflow:hidden;flex:0 0 auto}.avatar img{display:block;width:100%;height:100%;border-radius:999px;object-fit:cover}.avatar img.fallbackIcon{padding:0;object-fit:contain}.launcher .avatar{width:48px;height:48px;border:0;background:#000;color:#fff}",
    ".close{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;border-radius:999px;background:transparent;color:var(--muted);cursor:pointer;transition:background .2s,color .2s}.close svg{width:16px;height:16px}.close:hover{background:var(--avatar-bg);color:var(--panel-text)}",
    ".msgs{display:flex;flex:1;flex-direction:column;gap:16px;overflow:auto;padding:20px;scrollbar-width:thin}.msg{font-size:14px;line-height:1.35;white-space:pre-wrap;word-break:break-word}.in{align-self:flex-end;max-width:85%;border:0;border-radius:16px;background:#3f403c;color:#fff;box-shadow:none;padding:10px 12px}.agentMsg{align-self:flex-start;display:flex;width:fit-content;max-width:88%;flex-direction:column;align-items:flex-start;gap:8px}.out{max-width:100%;padding:0;background:transparent;color:var(--assistant)}",
    ".mediaWrap{display:flex;max-width:min(100%,300px);flex-direction:column;gap:8px}.media{display:block;max-width:100%;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.14)}.mediaImage{height:auto}.mediaVideo{max-height:240px}.mediaAudio{width:280px;max-width:100%;border:0}.mediaFrame{width:160px;aspect-ratio:9/16;height:auto;border-radius:0;background:rgba(255,255,255,.08)}.fileRow{display:flex;max-width:100%;align-items:center;gap:10px}.fileOpen{display:flex;align-items:center;justify-content:center;width:30px;height:30px;flex:0 0 auto;border-radius:999px;background:rgba(255,255,255,.92);color:#111827;text-decoration:none}.fileOpen svg{width:16px;height:16px}.caption{font-size:13px;line-height:1.35;color:inherit}",
    ".shimmer{display:inline-block;background:linear-gradient(135deg,#ffffff,#5E5E5E,#ffffff);background-clip:text;-webkit-background-clip:text;color:transparent;background-size:200% 100%;animation:kilobot-shimmer 5s linear infinite}.streamCursor{display:inline-block;width:6px;animation:kilobot-cursor 1s steps(2,start) infinite}@keyframes kilobot-cursor{50%{opacity:0}}@keyframes kilobot-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}",
    ".scrollDown{position:absolute;left:50%;bottom:68px;z-index:2;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;border-radius:999px;background:#fff;color:#111827;box-shadow:0 6px 16px rgba(0,0,0,.18);cursor:pointer;transform:translateX(-50%)}.layout-input_bar .scrollDown{bottom:18px}.scrollDown[hidden]{display:none}.scrollDown svg{width:16px;height:16px}",
    ".resetOverlay{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;padding:18px;background:transparent;backdrop-filter:blur(8px);pointer-events:auto}.resetOverlay[hidden]{display:none}.resetDialog{width:min(280px,100%);border:1px solid rgba(17,24,39,.1);border-radius:16px;background:rgba(255,255,255,.96);color:#111827;box-shadow:0 18px 42px rgba(0,0,0,.2);padding:16px}.resetTitle{font-size:15px;font-weight:400;line-height:1.25}.resetCopy{margin:6px 0 14px;color:#4b5563;font-size:13px;line-height:1.35}.resetActions{display:flex;justify-content:flex-end;gap:8px}.resetDismiss,.resetConfirm{height:34px;border:0;border-radius:999px;padding:0 13px;font-size:13px;font-weight:400;cursor:pointer}.resetDismiss{background:#f3f4f6;color:#374151}.resetConfirm{background:#111827;color:#fff}",
    ".composer{display:flex;align-items:center;gap:8px;border-radius:999px;pointer-events:auto}.bar{width:280px;max-width:100%;height:48px;margin:0 auto;border:1px solid var(--composer-border);background:var(--composer-bg);color:var(--composer-text);box-shadow:0 2px 10px rgba(0,0,0,.1);padding:0 8px 0 24px;transition:width .22s ease-in-out,height .22s ease-in-out,padding .22s ease-in-out,gap .22s ease-in-out,box-shadow .22s ease-in-out,transform .2s ease-in-out}.wrap:focus-within .bar{width:min(92vw,430px);box-shadow:0 6px 18px rgba(0,0,0,.12);transform:translateY(-2px)}",
    ".page-scrolling.layout-input_bar:not(.open):not(:focus-within) .bar{width:132px;height:40px;gap:4px;padding:0 5px 0 14px;box-shadow:0 2px 8px rgba(0,0,0,.08)}.page-scrolling.layout-input_bar:not(.open):not(:focus-within) .bar .send{width:30px;height:30px}",
    ".layout-right_avatar .bar,.layout-left_avatar .bar{display:none}.panelForm{display:none;height:44px;margin:0 16px 16px;border:1px solid var(--composer-border);background:var(--composer-bg);color:var(--composer-text);padding:0 7px 0 16px}.layout-right_avatar .panelForm,.layout-left_avatar .panelForm{display:flex}.launcher{display:none;align-items:center;width:max-content;max-width:min(92vw,260px);border-radius:999px;background:#fff;padding:5px;box-shadow:0 4px 12px rgba(0,0,0,.12);pointer-events:auto}.layout-right_avatar .launcher,.layout-left_avatar .launcher{display:flex}.layout-right_avatar .launcher{margin-left:auto}.launcherIcon{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border:0;border-radius:999px;background:#fff;color:#000;box-shadow:none;overflow:hidden;cursor:pointer}",
    "input{all:unset;min-width:0;flex:1;color:var(--composer-text);font-size:14px}input::placeholder{color:var(--composer-placeholder)}.send{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:0;border-radius:999px;background:var(--send-bg);color:var(--send-text);cursor:pointer;transition:background .2s,transform .2s,width .22s ease-in-out,height .22s ease-in-out}.send:hover{background:var(--send-hover)}.send:disabled{cursor:not-allowed;opacity:.55}.send svg{width:17px;height:17px}.power{padding:0 16px 14px;text-align:center;color:rgba(255,255,255,.55);font-size:11px;line-height:12px;pointer-events:auto;opacity:0;transition:opacity .22s ease}.power a{color:rgba(255,255,255,.65);text-decoration:none}.power a:hover{color:var(--panel-text);text-decoration:underline}.open .power{opacity:1}.layout-right_avatar .power,.layout-left_avatar .power{padding-bottom:8px}",
    "@media(prefers-reduced-motion:reduce){.bar,.bar .send{transition:none}}",
    "@media(max-width:480px),(max-height:480px) and (pointer:coarse){.wrap{bottom:calc(var(--mobile-viewport-bottom) + max(var(--mobile-edge),env(safe-area-inset-bottom,0px)))}.layout-input_bar,.layout-right_avatar,.layout-left_avatar{left:calc(var(--mobile-viewport-left) + max(var(--mobile-edge),env(safe-area-inset-left,0px)));right:calc(var(--mobile-viewport-right) + max(var(--mobile-edge),env(safe-area-inset-right,0px)));width:auto;transform:none}.layout-input_bar{bottom:calc(var(--mobile-viewport-bottom) + max(var(--mobile-edge),env(safe-area-inset-bottom,0px)) + var(--mobile-input-lift))}.panel{position:fixed;left:calc(var(--mobile-viewport-left) + max(var(--mobile-edge),env(safe-area-inset-left,0px)));right:calc(var(--mobile-viewport-right) + max(var(--mobile-edge),env(safe-area-inset-right,0px)));top:calc(var(--mobile-viewport-top) + max(var(--mobile-edge),env(safe-area-inset-top,0px)));bottom:calc(var(--mobile-viewport-bottom) + max(var(--mobile-edge),env(safe-area-inset-bottom,0px)) + var(--mobile-bar-height) + var(--mobile-panel-gap));width:auto;height:auto;max-height:calc(100dvh - var(--mobile-edge) - var(--mobile-edge) - var(--mobile-bar-height) - var(--mobile-panel-gap))}.layout-input_bar .panel{left:calc(var(--mobile-viewport-left) + max(var(--mobile-edge),env(safe-area-inset-left,0px)));right:calc(var(--mobile-viewport-right) + max(var(--mobile-edge),env(safe-area-inset-right,0px)));bottom:calc(var(--mobile-viewport-bottom) + max(var(--mobile-edge),env(safe-area-inset-bottom,0px)) + var(--mobile-bar-height) + var(--mobile-panel-gap));--panel-x:0}.layout-right_avatar .panel,.layout-left_avatar .panel{left:calc(var(--mobile-viewport-left) + max(var(--mobile-edge),env(safe-area-inset-left,0px)));right:calc(var(--mobile-viewport-right) + max(var(--mobile-edge),env(safe-area-inset-right,0px)));bottom:calc(var(--mobile-viewport-bottom) + max(var(--mobile-edge),env(safe-area-inset-bottom,0px)) + 64px)}.layout-input_bar .bar{width:236px}.wrap:focus-within .bar{width:100%}input{font-size:16px}}",
    "</style>",
    "<div class='wrap'><section class='panel' aria-live='polite'><div class='head'><div class='agent'><span class='avatar'></span><span class='name'></span></div><div class='headActions'><button class='close reset' type='button' aria-label='Reset chat'><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M8.5 5.2A5.7 5.7 0 1 1 5 10.4' stroke='currentColor' stroke-width='1.9' stroke-linecap='round'/><path d='M4.2 4.3v3.2h3.2' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'/></svg></button><button class='close' type='button' aria-label='Close chat'><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M5 7.5 10 12.5 15 7.5' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg></button></div></div><div class='msgs'></div><button class='scrollDown' type='button' aria-label='Scroll to latest message' hidden><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M5 7.5 10 12.5 15 7.5' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg></button><div class='power'>Powered by <a href='https://kilobot.app/' target='_blank' rel='noreferrer'>Kilobot</a></div><form class='composer panelForm'><input aria-label='Message' autocomplete='off' inputmode='text' enterkeyhint='send'/><button class='send' type='submit' aria-label='Send message'><svg viewBox='0 0 20 20' fill='none'><path d='M10 15V5m0 0L6 9m4-4 4 4' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'/></svg></button></form><div class='resetOverlay' hidden><div class='resetDialog' role='dialog' aria-modal='true' aria-label='Confirm clear conversation'><div class='resetTitle'>Clear conversation?</div><div class='resetCopy'>This will start a fresh chat on this browser.</div><div class='resetActions'><button class='resetDismiss' type='button'>Cancel</button><button class='resetConfirm' type='button'>Confirm</button></div></div></div></section><form class='composer bar'><input aria-label='Message' autocomplete='off' inputmode='text' enterkeyhint='send'/><button class='send' type='submit' aria-label='Send message'><svg viewBox='0 0 20 20' fill='none'><path d='M10 15V5m0 0L6 9m4-4 4 4' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'/></svg></button></form><div class='launcher'><button class='launcherIcon' type='button' aria-label='Open chat'><span class='avatar'></span></button></div></div>",
  ].join("");

  var wrap = root.querySelector(".wrap"), panel = root.querySelector(".panel"), barForm = root.querySelector(".bar"), panelForm = root.querySelector(".panelForm");
  var barInput = barForm.querySelector("input"), panelInput = panelForm.querySelector("input"), close = root.querySelector("[aria-label='Close chat']");
  var reset = root.querySelector(".reset"), resetOverlay = root.querySelector(".resetOverlay"), confirmReset = root.querySelector(".resetConfirm"), dismissReset = root.querySelector(".resetDismiss"), scrollDown = root.querySelector(".scrollDown"), launcher = root.querySelector(".launcher"), messagesEl = root.querySelector(".msgs"), poweredBy = root.querySelector(".power"), placeholderTimer = 0, viewportFrame = 0;
  barForm.addEventListener("submit", function (event) { event.preventDefault(); sendMessage(barInput); });
  panelForm.addEventListener("submit", function (event) { event.preventDefault(); sendMessage(panelInput); });
  barInput.addEventListener("focus", handleBarInputFocus);
  panelInput.addEventListener("focus", scheduleVisualViewportSync);
  barInput.addEventListener("keydown", handleInputEnter(barInput));
  panelInput.addEventListener("keydown", handleInputEnter(panelInput));
  launcher.addEventListener("click", function () { state.open ? closePanel() : openPanel(); if (state.open) window.setTimeout(function () { panelInput.focus(); }, 0); render(); });
  close.addEventListener("click", closePanel);
  reset.addEventListener("click", requestResetChat);
  resetOverlay.addEventListener("click", dismissResetDialog);
  dismissReset.addEventListener("click", dismissResetDialog);
  confirmReset.addEventListener("click", resetChat);
  messagesEl.addEventListener("scroll", updateScrollButton);
  scrollDown.addEventListener("click", scrollToBottom);
  window.addEventListener("scroll", handlePageScroll, { capture: true, passive: true });
  window.addEventListener("orientationchange", scheduleVisualViewportSync);
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", scheduleVisualViewportSync, { passive: true }); window.visualViewport.addEventListener("scroll", scheduleVisualViewportSync, { passive: true }); scheduleVisualViewportSync(); }
  document.addEventListener("pointerdown", function (event) {
    if (!state.open) return;
    var path = event.composedPath ? event.composedPath() : [];
    if (path.indexOf(host) === -1 || (path.indexOf(panel) === -1 && path.indexOf(barForm) === -1 && path.indexOf(launcher) === -1)) closePanel();
  });

  typePlaceholder(); loadConfig().then(loadMessages).then(function () { render(); wrap.classList.add("ready"); }).catch(function () { render(); wrap.classList.add("ready"); });

  function createVisitorId() { return crypto.randomUUID ? crypto.randomUUID() : fallbackId(); }
  function readVisitorId() {
    try { var existing = localStorage.getItem(storageKey); if (existing) return existing; var next = createVisitorId(); storeVisitorId(next); return next; } catch (_error) { return fallbackId(); }
  }
  function resetChat() {
    visitorId = createVisitorId();
    storeVisitorId(visitorId);
    clearStreams();
    state.messages = [];
    state.sending = false;
    state.awaitingReply = false;
    state.awaitingSince = 0;
    state.pendingIncoming = null;
    state.resetOpen = false;
    state.open = true;
    render();
  }
  function requestResetChat() { state.open = true; state.resetOpen = true; render(); }
  function dismissResetDialog(event) {
    if (event && event.target === dismissReset) { state.resetOpen = false; render(); return; }
    if (event.target !== resetOverlay) return;
    state.resetOpen = false;
    render();
  }
  function storeVisitorId(id) {
    try { localStorage.setItem(storageKey, id); return true; } catch (_error) { return false; }
  }
  function fallbackId() { return "visitor_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function fallbackIcon() { try { return new URL("/icon.svg", script.src || "https://kilobot.app/widget/v1.js").toString(); } catch (_error) { return "https://kilobot.app/icon.svg"; } }
  function endpoint(path, params) {
    var url = new URL(apiBase + path);
    Object.keys(params || {}).forEach(function (key) { url.searchParams.set(key, params[key]); });
    return url.toString();
  }
  function loadConfig() {
    return fetch(endpoint("/widget/config", { key: publicKey })).then(readJson).then(function (config) { state.config = config; typePlaceholder(); });
  }
  function loadMessages() {
    return fetch(endpoint("/widget/messages", { key: publicKey, visitorId: visitorId })).then(readJson).then(function (data) { state.messages = mergePendingIncoming(data.messages || []); syncAwaitingReply(); });
  }
  function readJson(response) { if (!response.ok) throw new Error("Widget request failed"); return response.json(); }
  function sendMessage(sourceInput) {
    var content = sourceInput.value.trim();
    if (!content || state.sending) return;
    var sentAt = Date.now(), pending = { id: "optimistic_" + sentAt, direction: "incoming", contentType: "text", content: content, createdAt: sentAt };
    state.open = true; state.sending = true; state.awaitingReply = true; state.awaitingSince = sentAt; state.pendingIncoming = pending; barInput.value = ""; panelInput.value = "";
    state.messages.push(pending);
    render();
    fetch(endpoint("/widget/message"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey: publicKey, visitorId: visitorId, content: content, pageUrl: location.href }),
    }).then(readJson).then(function (data) {
      state.messages = mergePendingIncoming(data.messages || state.messages);
      syncAwaitingReply();
      startPolling();
    }).catch(function () {
      state.awaitingReply = false;
      state.awaitingSince = 0;
      state.pendingIncoming = null;
      state.messages.push({ id: "error_" + Date.now(), direction: "outgoing", contentType: "text", content: "Message could not be sent. Please try again.", createdAt: Date.now() });
    }).finally(function () { state.sending = false; render(); });
  }
  function startPolling() {
    stopPolling();
    state.pollTimer = window.setInterval(function () { if (!state.open) return; loadMessages().then(render).catch(render); }, 2500);
  }
  function stopPolling() { if (state.pollTimer) window.clearInterval(state.pollTimer); state.pollTimer = 0; }
  function handlePageScroll() {
    if (state.open || root.activeElement === barInput) return;
    if (!state.pageScrolling) { state.pageScrolling = true; render(); }
    if (state.pageScrollTimer) window.clearTimeout(state.pageScrollTimer);
    state.pageScrollTimer = window.setTimeout(function () {
      if (clearPageScrolling()) render();
    }, 600);
  }
  function clearPageScrolling() {
    if (state.pageScrollTimer) window.clearTimeout(state.pageScrollTimer);
    state.pageScrollTimer = 0;
    if (!state.pageScrolling) return false;
    state.pageScrolling = false;
    return true;
  }
  function handleBarInputFocus() { openPanel(); scheduleVisualViewportSync(); }
  function scheduleVisualViewportSync() { if (!window.visualViewport || viewportFrame) return; viewportFrame = window.requestAnimationFrame(syncVisualViewport); }
  function syncVisualViewport() {
    viewportFrame = 0;
    var viewport = window.visualViewport;
    if (!viewport) return;
    var top = Math.max(0, viewport.offsetTop), left = Math.max(0, viewport.offsetLeft), bottom = Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height), right = Math.max(0, window.innerWidth - viewport.offsetLeft - viewport.width);
    wrap.style.setProperty("--mobile-viewport-top", top + "px"); wrap.style.setProperty("--mobile-viewport-bottom", bottom + "px"); wrap.style.setProperty("--mobile-viewport-left", left + "px"); wrap.style.setProperty("--mobile-viewport-right", right + "px");
  }
  function openPanel() { clearPageScrolling(); state.open = true; startPolling(); render(); }
  function closePanel() { state.open = false; state.resetOpen = false; render(); stopPolling(); }
  function handleInputEnter(input) {
    return function (event) { if (event.key !== "Enter" || event.isComposing) return; event.preventDefault(); if (input.value.trim()) sendMessage(input); };
  }
  function avatarHtml() { return "<img" + (state.config.iconUrl ? "" : " class='fallbackIcon'") + " src='" + escapeHtml(state.config.iconUrl || fallbackIconUrl) + "' alt='' />"; }
  function assistantAvatarHtml() { return avatarHtml(); }
  function syncAwaitingReply() {
    if (!state.awaitingReply) return;
    if (!hasFreshAssistantReply(state.messages)) return;
    state.awaitingReply = false;
    state.awaitingSince = 0;
    state.pendingIncoming = null;
  }
  function hasFreshAssistantReply(messages) {
    if (!state.awaitingSince) return false;
    return messages.some(function (message) { return message.direction === "outgoing" && Number(message.createdAt || 0) >= state.awaitingSince; });
  }
  function mergePendingIncoming(messages) {
    if (!state.pendingIncoming) return messages;
    if (hasFreshAssistantReply(messages)) { state.pendingIncoming = null; return messages; }
    var hasIncoming = messages.some(function (message) { return message.direction === "incoming" && message.content === state.pendingIncoming.content && Number(message.createdAt || 0) >= state.awaitingSince - 5000; });
    if (hasIncoming) { state.pendingIncoming = null; return messages; }
    return messages.concat(state.pendingIncoming);
  }
  function shouldShowThinking() { var latest = state.messages[state.messages.length - 1]; return Boolean(latest && latest.direction === "incoming" && (state.sending || state.awaitingReply)); }
  function thinkingHtml() {
    if (!shouldShowThinking()) return "";
    return "<div class='agentMsg thinking'><div class='msg out'><span class='shimmer'>Thinking...</span></div></div>";
  }
  function render() {
    var layout = state.config.layout || "input_bar", theme = state.config.theme === "dark" ? "dark" : "light";
    wrap.className = "wrap" + (wrap.className.indexOf("ready") > -1 ? " ready" : "") + " theme-" + theme + " layout-" + layout + (state.open ? " open" : "") + (state.pageScrolling ? " page-scrolling" : "");
    root.querySelectorAll(".avatar").forEach(function (node) { node.innerHTML = avatarHtml(); node.style.display = "flex"; });
    root.querySelector(".name").textContent = state.config.agentDisplayName || "AI Agent";
    poweredBy.style.display = state.config.poweredBy ? "block" : "none";
    root.querySelectorAll(".send").forEach(function (button) { button.disabled = state.sending; });
    resetOverlay.hidden = !state.resetOpen;
    renderMessages();
  }
  function renderMessages() {
    var nextHtml = state.messages.map(messageHtml).join("") + thinkingHtml();
    if (nextHtml === state.renderedMessagesHtml) return;
    state.renderedMessagesHtml = nextHtml;
    messagesEl.innerHTML = nextHtml;
    messagesEl.scrollTop = messagesEl.scrollHeight;
    updateScrollButton();
  }
  function updateScrollButton() { scrollDown.hidden = !state.open || messagesEl.scrollHeight - messagesEl.clientHeight - messagesEl.scrollTop <= 48; }
  function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; updateScrollButton(); }
  function typePlaceholder() {
    var name = state.config.agentDisplayName || "AI Agent", words = [state.config.placeholder || "Message...", "Ask " + name + " anything", "Get help from " + name], word = 0, index = 0, pause = 0, deleting = false;
    if (placeholderTimer) window.clearInterval(placeholderTimer);
    barInput.placeholder = ""; panelInput.placeholder = "";
    placeholderTimer = window.setInterval(function () {
      var chars = Array.from(words[word]), text = chars.slice(0, index).join("");
      barInput.placeholder = text; panelInput.placeholder = text;
      if (pause > 0) { pause -= 1; return; }
      if (deleting) { index -= 1; } else { index += 1; }
      if (index > chars.length) { index = chars.length; deleting = true; pause = 18; }
      if (index < 0) { index = 0; deleting = false; word = (word + 1) % words.length; pause = 3; }
    }, 38);
  }
  function messageHtml(message) {
    var cls = message.direction === "incoming" ? "msg in" : "msg out", body = message.mediaUrl ? mediaHtml(message) : textHtml(message);
    if (message.direction === "incoming") return "<div class='" + cls + "'>" + body + "</div>";
    return "<div class='agentMsg'><div class='" + cls + "'>" + body + "</div></div>";
  }
  function textHtml(message) {
    var text = message.direction === "outgoing" ? visibleAssistantText(message) : formatText(message.content || "");
    return text;
  }
  function mediaHtml(message) {
    var url = escapeHtml(message.mediaUrl || ""), type = String(message.contentType || ""), captionText = visibleMediaCaption(message), caption = captionText ? "<div class='caption'>" + formatText(captionText) + "</div>" : "";
    if (isImage(type, url)) return "<div class='mediaWrap'><img class='media mediaImage' src='" + url + "' alt='' loading='lazy' />" + caption + "</div>";
    if (isVideo(type, url)) return "<div class='mediaWrap'><video class='media mediaVideo' controls src='" + url + "'></video>" + caption + "</div>";
    if (isAudio(type, url)) return "<div class='mediaWrap'><audio class='media mediaAudio' controls src='" + url + "'></audio>" + caption + "</div>";
    return "<div class='mediaWrap'><div class='fileRow'><iframe class='media mediaFrame' src='" + url + "' title='File preview' loading='lazy'></iframe><a class='fileOpen' href='" + url + "' target='_blank' rel='noreferrer' aria-label='Open file'><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M7 7h6m0 0v6m0-6L6 14' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg></a></div>" + caption + "</div>";
  }
  function visibleMediaCaption(message) {
    var content = String(message.content || "").trim(), mediaUrl = String(message.mediaUrl || "").trim();
    if (!content || content === mediaUrl || isUrlOnly(content)) return "";
    return content;
  }
  function visibleAssistantText(message) {
    var id = message.id || message.createdAt, full = String(message.content || ""), visible = state.streamText[id];
    if (message.mediaUrl || !full) return formatText(full);
    if (visible === undefined) { state.streamText[id] = ""; startAssistantStream(message); return "<span class='streamCursor'>&nbsp;</span>"; }
    return formatText(visible) + (visible.length < full.length ? "<span class='streamCursor'>&nbsp;</span>" : "");
  }
  function startAssistantStream(message) {
    var id = message.id || message.createdAt, full = String(message.content || "");
    if (streamTimers[id]) return;
    streamTimers[id] = window.setInterval(function () {
      var current = state.streamText[id] || "", nextLength = Math.min(full.length, current.length + Math.max(1, Math.ceil(full.length / 24)));
      state.streamText[id] = full.slice(0, nextLength);
      if (nextLength >= full.length) { window.clearInterval(streamTimers[id]); delete streamTimers[id]; }
      render();
    }, 35);
  }
  function clearStreams() {
    Object.keys(streamTimers).forEach(function (id) { window.clearInterval(streamTimers[id]); });
    streamTimers = {};
    state.streamText = {};
  }
  function isImage(type, url) { return type === "image" || type.indexOf("image/") === 0 || /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(url); }
  function isVideo(type, url) { return type === "video" || type.indexOf("video/") === 0 || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url); }
  function isAudio(type, url) { return type === "audio" || type.indexOf("audio/") === 0 || /\.(mp3|wav|ogg|m4a)(\?|#|$)/i.test(url); }
  function isUrlOnly(value) { return /^https?:\/\/\S+$/i.test(String(value).trim()); }
  function formatText(value) {
    return escapeHtml(value).replace(/\*([^*\n][^*\n]*?)\*/g, function (_match, text) { return "<strong>" + text + "</strong>"; });
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]; });
  }
})();
