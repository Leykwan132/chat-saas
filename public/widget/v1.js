(function () {
  var script = document.currentScript;
  if (!script) return;

  var excludedPathPrefix = script.getAttribute("data-kilobot-exclude-path-prefix") || "";
  if (excludedPathPrefix && window.location.pathname.startsWith(excludedPathPrefix)) return;

  var publicKey = script.getAttribute("data-kilobot-widget") || "";
  var mode = script.getAttribute("data-kilobot-mode") === "traditional" ? "traditional" : "ai_powered";
  var apiBase = (script.getAttribute("data-kilobot-api") || "https://outstanding-rabbit-215.convex.site").replace(/\/+$/, "");
  if (!publicKey || !apiBase) return;
  var widgetLoads = window.KilobotWidgetLoads || (window.KilobotWidgetLoads = {});
  if (widgetLoads[publicKey]) return;
  widgetLoads[publicKey] = true;

  function configUrl() {
    var url = new URL(apiBase + "/widget/config");
    url.searchParams.set("key", publicKey);
    url.searchParams.set("mode", mode);
    return url.toString();
  }

  function loadRuntime(name, config) {
    var runtime = document.createElement("script");
    runtime.src = new URL("./" + name + ".js", script.src).toString();
    runtime.async = true;
    ["data-kilobot-widget", "data-kilobot-mode", "data-kilobot-api", "data-kilobot-exclude-path-prefix"].forEach(function (attribute) {
      if (script.hasAttribute(attribute)) runtime.setAttribute(attribute, script.getAttribute(attribute));
    });
    runtime.onload = function () {
      if (name === "traditional" && window.KilobotTraditionalWidget) {
        window.KilobotTraditionalWidget.mount(config, publicKey);
      }
    };
    document.head.appendChild(runtime);
  }

  fetch(configUrl())
    .then(function (response) {
      if (!response.ok) throw new Error("Widget request failed");
      return response.json();
    })
    .then(function (config) {
      loadRuntime(mode === "traditional" ? "traditional" : "ai", config);
    })
    .catch(function (error) {
      delete widgetLoads[publicKey];
      console.error("Kilobot widget failed to load", error);
    });
})();
