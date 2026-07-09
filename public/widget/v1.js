(function () {
  var script = document.currentScript;
  if (!script) return;

  var publicKey = script.getAttribute("data-kilobot-widget") || "";
  var apiBase = (script.getAttribute("data-kilobot-api") || "https://outstanding-rabbit-215.convex.site").replace(/\/+$/, "");
  if (!publicKey || !apiBase) return;

  var fallbackIconUrl = fallbackIcon();
  var storageKey = "kilobot:widget:" + publicKey + ":visitorId";
  var visitorId = readVisitorId();
  var state = {
    config: {
      agentDisplayName: "AI Agent",
      layout: "input_bar",
      placeholder: "What can AI Agent help with?",
      theme: "light",
      poweredBy: true,
    },
    messages: [],
    open: false,
    sending: false,
    awaitingReply: false,
    pollTimer: 0,
  };

  var host = document.createElement("div");
  host.setAttribute("data-kilobot-root", publicKey);
  document.documentElement.appendChild(host);
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML = [
    "<style>",
    ":host{all:initial;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827}",
    ".wrap{position:fixed;bottom:18px;z-index:2147483647;pointer-events:none;opacity:0;translate:0 14px;visibility:hidden;transition:opacity .28s ease,translate .28s ease,visibility 0s .28s;--panel-bg:rgba(139,140,134,.82);--panel-text:#fff;--panel-border:rgba(255,255,255,.2);--header-bg:transparent;--muted:rgba(255,255,255,.7);--assistant:rgba(255,255,255,.92);--in-bg:rgba(255,255,255,.16);--in-text:#fff;--avatar-bg:rgba(255,255,255,.12);--avatar-text:#fff;--composer-bg:rgba(255,255,255,.92);--composer-text:#111827;--composer-border:rgba(17,24,39,.08);--composer-placeholder:#a5abb5;--send-bg:#e5e7eb;--send-text:#111827;--send-hover:#d1d5db;--launcher-bg:#fff;--launcher-text:#111827;--shine1:rgba(255,255,255,.16);--shine2:rgba(255,255,255,.07);--mobile-edge:12px;--mobile-bar-height:48px;--mobile-panel-gap:22px}",
    ".ready{opacity:1;translate:0 0;visibility:visible;transition-delay:0s}",
    ".wrap,.wrap *{box-sizing:border-box}",
    ".theme-dark{--panel-bg:rgba(139,140,134,.82);--panel-text:#fff;--panel-border:rgba(255,255,255,.2);--header-bg:transparent;--muted:rgba(255,255,255,.7);--assistant:rgba(255,255,255,.92);--in-bg:rgba(255,255,255,.16);--in-text:#fff;--avatar-bg:rgba(255,255,255,.12);--avatar-text:#fff;--composer-bg:#000;--composer-text:#fff;--composer-border:rgba(255,255,255,.12);--composer-placeholder:rgba(255,255,255,.42);--send-bg:#fff;--send-text:#000;--send-hover:rgba(255,255,255,.86);--launcher-bg:#000;--launcher-text:#fff;--shine1:rgba(255,255,255,.16);--shine2:rgba(255,255,255,.07)}",
    ".layout-input_bar{left:50%;transform:translateX(-50%);width:min(92vw,430px)}",
    ".layout-right_avatar{right:18px;width:min(92vw,430px)}.layout-left_avatar{left:18px;width:min(92vw,430px)}",
    ".panel{position:absolute;display:flex;flex-direction:column;width:min(92vw,430px);height:min(70vh,474px);overflow:hidden;border:1px solid var(--panel-border);border-radius:24px;background:var(--panel-bg);color:var(--panel-text);box-shadow:0 8px 24px rgba(0,0,0,.16);backdrop-filter:blur(18px);pointer-events:none;opacity:0;transform:translate(var(--panel-x,0),32px);transition:opacity .28s ease-in-out,transform .3s ease-in-out}",
    ".panel:before{content:'';position:absolute;left:0;right:0;top:0;height:96px;background:linear-gradient(180deg,var(--shine1),var(--shine2),transparent);pointer-events:none}",
    ".layout-input_bar .panel{left:50%;bottom:64px;--panel-x:-50%}.layout-right_avatar .panel{right:0;bottom:64px}.layout-left_avatar .panel{left:0;bottom:64px}",
    ".open .panel{pointer-events:auto;opacity:1;transform:translate(var(--panel-x,0),0)}",
    ".head,.msgs,.panelForm,.power{position:relative;z-index:1}",
    ".head{display:flex;align-items:center;justify-content:space-between;min-height:56px;background:var(--header-bg);padding:12px 16px}",
    ".agent{display:flex;align-items:center;gap:10px;min-width:0;font-size:14px;font-weight:650}",
    ".avatar{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid var(--panel-border);border-radius:999px;background:var(--avatar-bg);color:var(--avatar-text);overflow:hidden;flex:0 0 auto}",
    ".avatar img{display:block;width:100%;height:100%;border-radius:999px;object-fit:cover}.avatar img.fallbackIcon{padding:3px;object-fit:contain}.launcher .avatar{width:40px;height:40px;border:0;background:#000;color:#fff}",
    ".close{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;border-radius:999px;background:transparent;color:var(--muted);cursor:pointer;transition:background .2s,color .2s}.close svg{width:16px;height:16px}.close:hover{background:var(--avatar-bg);color:var(--panel-text)}",
    ".msgs{display:flex;flex:1;flex-direction:column;gap:12px;overflow:auto;padding:20px;scrollbar-width:thin}",
    ".msg{font-size:14px;line-height:1.35;white-space:pre-wrap;word-break:break-word}",
    ".in{align-self:flex-end;max-width:85%;border:1px solid rgba(255,255,255,.15);border-radius:10px;background:var(--in-bg);color:var(--in-text);box-shadow:0 1px 2px rgba(0,0,0,.08);padding:10px 12px}.agentMsg{align-self:flex-start;display:flex;width:fit-content;max-width:88%;flex-direction:column;align-items:flex-start;gap:8px}.msgAvatar{box-sizing:border-box;position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid var(--panel-border);border-radius:999px;background:var(--avatar-bg);color:var(--avatar-text);overflow:hidden}.msgAvatar.loading{border:0;padding:2px;background:transparent}.msgAvatar.loading:before{content:'';position:absolute;inset:0;border-radius:inherit;background:radial-gradient(transparent,transparent,rgba(255,255,255,.18),rgba(255,255,255,.92),rgba(255,255,255,.28),transparent,transparent);background-size:300% 300%;animation:kilobot-shine 2.6s linear infinite}.msgAvatar img{position:relative;z-index:1;width:100%;height:100%;border-radius:999px;object-fit:cover}.out{max-width:100%;padding:0;background:transparent;color:var(--assistant)}",
    ".shimmer{position:relative;display:inline-block;color:transparent;background-image:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.92) 50%,transparent 100%),linear-gradient(var(--muted),var(--muted));background-size:250% 100%,auto;background-clip:text;background-repeat:no-repeat;animation:kilobot-shimmer 2s linear infinite}@keyframes kilobot-shimmer{0%{background-position:100% center}100%{background-position:0% center}}@keyframes kilobot-shine{0%{background-position:100% 100%}100%{background-position:0% 0%}}",
    ".composer{display:flex;align-items:center;gap:8px;border-radius:999px;pointer-events:auto}",
    ".bar{width:280px;max-width:100%;height:48px;margin:0 auto;border:1px solid var(--composer-border);background:var(--composer-bg);color:var(--composer-text);box-shadow:0 2px 10px rgba(0,0,0,.1);padding:0 8px 0 24px;transition:width .28s ease-in-out,box-shadow .2s ease-in-out,transform .2s ease-in-out}",
    ".wrap:focus-within .bar{width:min(92vw,430px);box-shadow:0 6px 18px rgba(0,0,0,.12);transform:translateY(-2px)}",
    ".layout-right_avatar .bar,.layout-left_avatar .bar{display:none}",
    ".panelForm{display:none;height:44px;margin:0 16px 16px;border:1px solid var(--composer-border);background:var(--composer-bg);color:var(--composer-text);padding:0 7px 0 16px}.layout-right_avatar .panelForm,.layout-left_avatar .panelForm{display:flex}",
    ".launcher{display:none;align-items:center;width:max-content;max-width:min(92vw,260px);border-radius:999px;background:#fff;padding:4px;box-shadow:0 4px 12px rgba(0,0,0,.12);pointer-events:auto}.layout-right_avatar .launcher,.layout-left_avatar .launcher{display:flex}.layout-right_avatar .launcher{margin-left:auto}.launcherIcon{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:0;border-radius:999px;background:#fff;color:#000;box-shadow:none;overflow:hidden;cursor:pointer}",
    "input{all:unset;min-width:0;flex:1;color:var(--composer-text);font-size:14px}input::placeholder{color:var(--composer-placeholder)}",
    ".send{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:0;border-radius:999px;background:var(--send-bg);color:var(--send-text);cursor:pointer;transition:background .2s,transform .2s}",
    ".send:hover{background:var(--send-hover)}.send:disabled{cursor:not-allowed;opacity:.55}.send svg{width:17px;height:17px}",
    ".power{padding:0 16px 14px;text-align:center;color:rgba(255,255,255,.55);font-size:11px;line-height:12px;pointer-events:auto;opacity:0;transition:opacity .22s ease}.power a{color:rgba(255,255,255,.65);text-decoration:none}.power a:hover{color:var(--panel-text);text-decoration:underline}.open .power{opacity:1}.layout-right_avatar .power,.layout-left_avatar .power{padding-bottom:8px}",
    "@media(max-width:480px){.wrap{bottom:var(--mobile-edge)}.layout-input_bar,.layout-right_avatar,.layout-left_avatar{left:var(--mobile-edge);right:var(--mobile-edge);width:auto;transform:none}.panel{position:fixed;left:var(--mobile-edge);right:var(--mobile-edge);top:var(--mobile-edge);bottom:calc(var(--mobile-edge) + var(--mobile-bar-height) + var(--mobile-panel-gap));width:auto;height:auto;max-height:calc(100dvh - var(--mobile-edge) - var(--mobile-edge) - var(--mobile-bar-height) - var(--mobile-panel-gap))}.layout-input_bar .panel{left:var(--mobile-edge);right:var(--mobile-edge);--panel-x:0}.layout-right_avatar .panel,.layout-left_avatar .panel{left:var(--mobile-edge);right:var(--mobile-edge);bottom:76px}.layout-input_bar .bar{width:236px}.wrap:focus-within .bar{width:100%}}",
    "</style>",
    "<div class='wrap'>",
    "<section class='panel' aria-live='polite'>",
    "<div class='head'><div class='agent'><span class='avatar'></span><span class='name'></span></div><button class='close' type='button' aria-label='Close chat'><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M5 7.5 10 12.5 15 7.5' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg></button></div>",
    "<div class='msgs'></div>",
    "<div class='power'>Powered by <a href='https://kilobot.app/' target='_blank' rel='noreferrer'>Kilobot</a></div>",
    "<form class='composer panelForm'><input autocomplete='off'/><button class='send' type='submit' aria-label='Send message'><svg viewBox='0 0 20 20' fill='none'><path d='M10 15V5m0 0L6 9m4-4 4 4' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'/></svg></button></form>",
    "</section>",
    "<form class='composer bar'><input autocomplete='off'/><button class='send' type='submit' aria-label='Send message'><svg viewBox='0 0 20 20' fill='none'><path d='M10 15V5m0 0L6 9m4-4 4 4' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'/></svg></button></form>",
    "<div class='launcher'><button class='launcherIcon' type='button' aria-label='Open chat'><span class='avatar'></span></button></div>",
    "</div>",
  ].join("");

  var wrap = root.querySelector(".wrap"), panel = root.querySelector(".panel");
  var barForm = root.querySelector(".bar");
  var panelForm = root.querySelector(".panelForm");
  var barInput = barForm.querySelector("input"), panelInput = panelForm.querySelector("input");
  var close = root.querySelector(".close");
  var launcher = root.querySelector(".launcher");
  var messagesEl = root.querySelector(".msgs"), poweredBy = root.querySelector(".power"), placeholderTimer = 0;

  barForm.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(barInput);
  });
  panelForm.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(panelInput);
  });
  barInput.addEventListener("focus", openPanel);
  barInput.addEventListener("keydown", handleInputEnter(barInput));
  panelInput.addEventListener("keydown", handleInputEnter(panelInput));
  launcher.addEventListener("click", function () {
    if (state.open) {
      closePanel();
    } else {
      openPanel();
      window.setTimeout(function () {
        panelInput.focus();
      }, 0);
    }
    render();
  });
  close.addEventListener("click", closePanel);
  document.addEventListener("pointerdown", function (event) {
    if (!state.open) return;
    var path = event.composedPath ? event.composedPath() : [];
    if (path.indexOf(host) === -1 || (path.indexOf(panel) === -1 && path.indexOf(barForm) === -1 && path.indexOf(launcher) === -1)) closePanel();
  });

  typePlaceholder(); loadConfig().then(loadMessages).then(function () { render(); wrap.classList.add("ready"); }).catch(function () { render(); wrap.classList.add("ready"); });

  function readVisitorId() {
    try {
      var existing = localStorage.getItem(storageKey);
      if (existing) return existing;
      var next = crypto.randomUUID ? crypto.randomUUID() : fallbackId();
      localStorage.setItem(storageKey, next);
      return next;
    } catch (_error) {
      return fallbackId();
    }
  }

  function fallbackId() { return "visitor_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }

  function fallbackIcon() {
    try { return new URL("/icon.svg", script.src || "https://kilobot.app/widget/v1.js").toString(); } catch (_error) { return "https://kilobot.app/icon.svg"; }
  }

  function endpoint(path, params) {
    var url = new URL(apiBase + path);
    Object.keys(params || {}).forEach(function (key) {
      url.searchParams.set(key, params[key]);
    });
    return url.toString();
  }

  function loadConfig() {
    return fetch(endpoint("/widget/config", { key: publicKey }))
      .then(readJson)
      .then(function (config) {
        state.config = config;
        typePlaceholder();
      });
  }

  function loadMessages() {
    return fetch(endpoint("/widget/messages", { key: publicKey, visitorId: visitorId }))
      .then(readJson)
      .then(function (data) {
        state.messages = data.messages || [];
        syncAwaitingReply();
      });
  }

  function readJson(response) { if (!response.ok) throw new Error("Widget request failed"); return response.json(); }

  function sendMessage(sourceInput) {
    var content = sourceInput.value.trim();
    if (!content || state.sending) return;
    state.open = true;
    state.sending = true;
    state.awaitingReply = true;
    barInput.value = "";
    panelInput.value = "";
    state.messages.push({
      id: "optimistic_" + Date.now(),
      direction: "incoming",
      contentType: "text",
      content: content,
      createdAt: Date.now(),
    });
    render();
    fetch(endpoint("/widget/message"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: publicKey,
        visitorId: visitorId,
        content: content,
        pageUrl: location.href,
      }),
    })
      .then(readJson)
      .then(function (data) {
        state.messages = data.messages || state.messages;
        syncAwaitingReply();
        startPolling();
      })
      .catch(function () {
        state.awaitingReply = false;
        state.messages.push({
          id: "error_" + Date.now(),
          direction: "outgoing",
          contentType: "text",
          content: "Message could not be sent. Please try again.",
          createdAt: Date.now(),
        });
      })
      .finally(function () {
        state.sending = false;
        render();
      });
  }

  function startPolling() {
    stopPolling();
    state.pollTimer = window.setInterval(function () {
      if (!state.open) return;
      loadMessages().then(render).catch(function () {});
    }, 2500);
  }

  function stopPolling() { if (state.pollTimer) window.clearInterval(state.pollTimer); state.pollTimer = 0; }

  function openPanel() { state.open = true; startPolling(); render(); }
  function closePanel() { state.open = false; render(); stopPolling(); }

  function handleInputEnter(input) {
    return function (event) {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      if (input.value.trim()) sendMessage(input);
    };
  }

  function avatarHtml() {
    return "<img" + (state.config.iconUrl ? "" : " class='fallbackIcon'") + " src='" + escapeHtml(state.config.iconUrl || fallbackIconUrl) + "' alt='' />";
  }

  function assistantAvatarHtml() { return avatarHtml(); }

  function syncAwaitingReply() { var latest = state.messages[state.messages.length - 1]; if (latest && latest.direction === "outgoing") state.awaitingReply = false; }
  function shouldShowThinking() { var latest = state.messages[state.messages.length - 1]; return Boolean(latest && latest.direction === "incoming" && (state.sending || state.awaitingReply)); }

  function thinkingHtml() {
    if (!shouldShowThinking()) return "";
    var avatar = assistantAvatarHtml();
    var avatarHtml = avatar ? "<span class='msgAvatar loading'>" + avatar + "</span>" : "";
    return "<div class='agentMsg thinking'>" + avatarHtml + "<div class='msg out'><span class='shimmer'>Thinking...</span></div></div>";
  }

  function render() {
    var layout = state.config.layout || "input_bar";
    var theme = state.config.theme === "dark" ? "dark" : "light";
    wrap.className = "wrap" + (wrap.className.indexOf("ready") > -1 ? " ready" : "") + " theme-" + theme + " layout-" + layout + (state.open ? " open" : "");
    root.querySelectorAll(".avatar").forEach(function (node) {
      node.innerHTML = avatarHtml();
      node.style.display = "flex";
    });
    root.querySelector(".name").textContent = state.config.agentDisplayName || "AI Agent";
    poweredBy.style.display = state.config.poweredBy ? "block" : "none";
    root.querySelectorAll(".send").forEach(function (button) {
      button.disabled = state.sending;
    });
    messagesEl.innerHTML = state.messages.map(messageHtml).join("") + thinkingHtml();
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function typePlaceholder() {
    var name = state.config.agentDisplayName || "AI Agent";
    var words = [state.config.placeholder || "Message...", "Ask " + name + " anything", "Get help from " + name], word = 0, index = 0, pause = 0, deleting = false;
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
    var cls = message.direction === "incoming" ? "msg in" : "msg out";
    var content = escapeHtml(message.content || "");
    if (message.mediaUrl) {
      return "<div class='" + cls + "'><a href='" + escapeHtml(message.mediaUrl) + "' target='_blank' rel='noreferrer'>Attachment</a></div>";
    }
    if (message.direction === "incoming") {
      return "<div class='" + cls + "'>" + content + "</div>";
    }
    var avatar = assistantAvatarHtml();
    var avatarHtml = avatar ? "<span class='msgAvatar'>" + avatar + "</span>" : "";
    return "<div class='agentMsg'>" + avatarHtml + "<div class='" + cls + "'>" + content + "</div></div>";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
})();
