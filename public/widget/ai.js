(function () {
  var script = document.currentScript;
  var publicKey = script && script.getAttribute("data-kilobot-widget");
  if (
    !publicKey ||
    document.querySelector("iframe[data-kilobot-widget='" + publicKey + "']")
  )
    return;
  var widgetUrl = new URL("../widget.html", script.src);
  var widgetOrigin = widgetUrl.origin;
  var apiBase = (
    script.getAttribute("data-kilobot-api") ||
    "https://strong-chameleon-837.convex.site"
  ).replace(/\/+$/, "");
  var storageKey = "kilobot:widget:" + publicKey + ":visitorId";
  var visitorId = localStorage.getItem(storageKey);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(storageKey, visitorId);
  }
  var frame = document.createElement("iframe");
  frame.dataset.kilobotWidget = publicKey;
  frame.title = "Kilobot chat";
  frame.src = widgetUrl.toString();
  frame.style.cssText =
    "position:fixed;z-index:2147483647;right:16px;bottom:16px;width:52px;height:52px;border:0;background:transparent;overflow:hidden";
  document.body.appendChild(frame);
  var frameOpen = false;
  function isMobileViewport() {
    return window.matchMedia("(max-width: 560px)").matches;
  }
  function setFrameOpen(open) {
    frameOpen = open;
    frame.style.width = open ? "min(390px, calc(100vw - 24px))" : "52px";
    frame.style.height = open
      ? isMobileViewport()
        ? "min(702px, calc(100vh - 24px))"
        : "min(672px, calc(100vh - 24px))"
      : "52px";
  }
  function sendInit() {
    frame.contentWindow.postMessage(
      {
        source: "kilobot-host",
        version: 1,
        type: "init",
        publicKey: publicKey,
        visitorId: visitorId,
        apiBase: apiBase,
        pageUrl: location.href,
        device: isMobileViewport() ? "mobile" : "desktop",
      },
      widgetOrigin,
    );
  }
  window.addEventListener("message", function (event) {
    if (
      event.origin !== widgetOrigin ||
      event.source !== frame.contentWindow ||
      !event.data ||
      event.data.source !== "kilobot-frame"
    )
      return;
    if (event.data.type === "ready") sendInit();
    if (event.data.type === "state" && typeof event.data.open === "boolean")
      setFrameOpen(event.data.open);
  });
  window.KilobotWidget = window.KilobotWidget || {};
  window.KilobotWidget.open = function () {
    setFrameOpen(true);
    frame.contentWindow.postMessage(
      { source: "kilobot-host", version: 1, type: "command", command: "open" },
      widgetOrigin,
    );
  };
  window.addEventListener("resize", function () {
    setFrameOpen(frameOpen);
    sendInit();
  });
})();
