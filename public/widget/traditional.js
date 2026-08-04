(function () {
  var whatsappIcon = "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512' fill='none' role='img' aria-label='WhatsApp icon'><path d='M256 8C119 8 8 119 8 256c0 52.5 16.3 101.1 44.2 141.1L24 496l99.3-30.4C161.5 488.9 207.8 504 256 504c137 0 248-111 248-248S393 8 256 8Z' fill='#25D366' stroke='white' stroke-width='22' stroke-linejoin='round'/><path fill='white' d='M349.6 337.7c-4.1-2-24.2-11.9-28-13.3-3.8-1.4-6.6-2-9.3 2-2.7 4.1-10.7 13.3-13.1 16-2.4 2.7-4.8 3.1-8.9 1-24.1-12-39.9-21.4-55.8-48.5-4.2-7.2 4.2-6.7 12-22.2 1.4-2.7.7-5.1-.3-7.2-1-2-9.3-22.5-12.7-30.8-3.3-8-6.7-6.9-9.3-7-2.4-.1-5.1-.1-7.9-.1-2.7 0-7.2 1-11 5.1-3.8 4.1-14.5 14.1-14.5 34.4 0 20.3 14.8 39.9 16.9 42.6 2 2.7 29.2 44.6 70.7 62.5 26.2 11.3 36.4 12.2 49.5 10.2 8-1.2 24.2-9.9 27.6-19.6 3.4-9.6 3.4-17.9 2.4-19.6-1-1.7-3.8-2.7-7.9-4.8Z'/></svg>";

  function mount(config, publicKey) {
    var host = document.createElement("div");
    host.setAttribute("data-kilobot-root", publicKey);
    document.documentElement.appendChild(host);
    var root = host.attachShadow({ mode: "open" });
    root.innerHTML = [
      "<style>",
      "@import url('https://fonts.googleapis.com/css2?family=Google+Sans+Flex&display=swap');",
      ":host{all:initial;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".wrap{position:fixed;right:max(18px,env(safe-area-inset-right,0px));bottom:max(18px,env(safe-area-inset-bottom,0px));z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:8px}",
      ".pill{display:flex;max-width:min(calc(100vw - 36px),320px);align-items:center;gap:10px;border:0;border-radius:999px;background:var(--main-color);color:var(--foreground-color);padding:8px 18px 8px 9px;text-decoration:none;transition:transform .2s ease}",
      ".pill:hover{transform:translateY(-2px)}.pill:focus-visible{outline:3px solid #111827;outline-offset:3px}",
      ".icon{display:flex;width:34px;height:34px;flex:0 0 auto;align-items:center;justify-content:center;border-radius:999px;overflow:hidden}.icon svg,.icon img{display:block;width:100%;height:100%;object-fit:contain}",
      ".label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Google Sans Flex',sans-serif;font-size:15px;font-weight:400;line-height:1.2}.brand{align-self:center;color:#6b7280;font-size:11px;line-height:1.2}.brand a{color:inherit;text-decoration:none}.brand a:hover{text-decoration:underline}",
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
