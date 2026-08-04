(function () {
  var whatsappIcon = "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512' role='img' aria-label='WhatsApp icon'><path fill='#4CAF50' d='M256 0C114.6 0 0 114.6 0 256c0 54.4 17 104.8 46 146.3L16 502l102.7-31.4C158.4 496.8 205.5 512 256 512c141.4 0 256-114.6 256-256S397.4 0 256 0Z'/><path fill='#FAFAFA' d='M409 329c0-4.4-2-8.5-5.6-10.8l-61.7-34.7c-6.1-3.4-13.8-1.8-18 3.8l-21.6 28.1c-4.7 6.1-13.1 8-20 4.5-26.8-13.5-49.3-30.7-68-51.8-12.5-14.1-22.5-28.9-30.1-44.5-3.1-6.4-1.8-14.1 3.2-19.2l18.4-18.9c4.2-4.3 5.3-10.8 2.8-16.2l-26.6-60.6c-2.3-5.3-7.5-8.7-13.3-8.7h-15.6c-14.5 0-26.4 4.6-35.4 13.7-11.2 11.3-17 27.9-17 49.4 0 25.3 8.8 52.3 26.2 80.1 17.3 27.6 40.1 53.4 67.8 76.7 27.7 23.3 57.6 42 88.8 55.5 31.3 13.5 57.8 20.3 78.7 20.3 18.5 0 33.7-5 45.1-14.8 14.5-12.5 22-31.4 22-56.2V329Z'/></svg>";

  function mount(config, publicKey) {
    var host = document.createElement("div");
    host.setAttribute("data-kilobot-root", publicKey);
    document.documentElement.appendChild(host);
    var root = host.attachShadow({ mode: "open" });
    root.innerHTML = [
      "<style>",
      ":host{all:initial;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".wrap{position:fixed;right:max(18px,env(safe-area-inset-right,0px));bottom:max(18px,env(safe-area-inset-bottom,0px));z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:8px}",
      ".pill{display:flex;max-width:min(calc(100vw - 36px),320px);align-items:center;gap:10px;border:0;border-radius:999px;background:var(--main-color);color:var(--foreground-color);padding:8px 18px 8px 9px;text-decoration:none;transition:transform .2s ease}",
      ".pill:hover{transform:translateY(-2px)}.pill:focus-visible{outline:3px solid #111827;outline-offset:3px}",
      ".icon{display:flex;width:34px;height:34px;flex:0 0 auto;align-items:center;justify-content:center;border-radius:999px;overflow:hidden}.icon svg,.icon img{display:block;width:100%;height:100%;object-fit:contain}",
      ".label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;font-weight:400;line-height:1.2}.brand{align-self:center;color:#6b7280;font-size:11px;line-height:1.2}.brand a{color:inherit;text-decoration:none}.brand a:hover{text-decoration:underline}",
      "@media(prefers-reduced-motion:reduce){.pill{transition:none}.pill:hover{transform:none}}",
      "</style>",
      "<div class='wrap'><a class='pill' rel='noopener noreferrer'><span class='icon'></span><span class='label'></span></a><span class='brand'>Powered by <a href='https://kilobot.app/' target='_blank' rel='noopener noreferrer'>Kilobot</a></span></div>",
    ].join("");
    var pill = root.querySelector(".pill");
    var icon = root.querySelector(".icon");
    var label = root.querySelector(".label");
    var brand = root.querySelector(".brand");
    pill.href = config.destinationUrl;
    pill.style.setProperty("--main-color", config.mainColor);
    pill.style.setProperty("--foreground-color", config.foregroundColor);
    pill.setAttribute("aria-label", config.label + " on WhatsApp");
    label.textContent = config.label;
    if (config.iconUrl) {
      var image = document.createElement("img");
      image.src = config.iconUrl;
      image.alt = "";
      icon.appendChild(image);
    } else {
      icon.innerHTML = whatsappIcon;
    }
    brand.hidden = !config.poweredBy;
  }

  window.KilobotTraditionalWidget = { mount: mount };
})();
