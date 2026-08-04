(function () {
  var whatsappIcon = "<svg xmlns='http://www.w3.org/2000/svg' width='720' height='720' viewBox='-96 -96 912 912' role='img' aria-label='WhatsApp icon'><path fill='#25d366' d='M360,0C161.18,0,0,161.18,0,360c0,65.41,17.45,126.75,47.94,179.61L0,720l187.02-44.21c51.34,28.18,110.28,44.21,172.98,44.21,198.82,0,360-161.18,360-360S558.82,0,360,0ZM360,655.52c-60.17,0-116.13-17.98-162.82-48.87l-110.49,28.14,30.99-105.61c-33.53-47.93-53.2-106.26-53.2-169.19,0-163.21,132.31-295.52,295.52-295.52s295.52,132.31,295.52,295.52-132.31,295.52-295.52,295.52Z'/><path fill='#25d366' d='M444.35,407.52l87.1,41.06c4,1.88,6.56,5.94,6.2,10.34-.94,11.46-5.54,34.43-26.13,55.02-58.12,58.12-162.49-7.64-166.74-10.18-25.67-13.79-50.06-32.24-73.19-55.36-23.12-23.12-41.58-47.52-55.37-73.19-2.55-4.24-68.31-108.61-10.18-166.74,20.59-20.59,43.56-25.19,55.02-26.13,4.41-.36,8.46,2.2,10.34,6.2l41.07,87.1c1.94,4.12,1.09,9.02-2.13,12.24l-30.61,30.61c-6.62,6.62-8.56,16.93-4,25.11,11.17,20.03,26.19,39.32,43.59,57.07,17.75,17.4,37.04,32.43,57.07,43.59,8.18,4.56,18.48,2.62,25.11-4l30.61-30.61c3.22-3.22,8.12-4.08,12.24-2.13Z'/></svg>";

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
      ".pill{display:flex;max-width:min(calc(100vw - 36px),320px);align-items:center;justify-content:center;gap:4px;border:4px solid var(--main-color);border-radius:999px;background:#fff;color:var(--main-color);padding:7px 12px;text-decoration:none}",
      ".pill:focus-visible{outline:3px solid #111827;outline-offset:3px}",
      ".icon{display:flex;width:28px;height:28px;flex:0 0 auto;align-items:center;justify-content:center}.icon svg,.icon img{display:block;width:100%;height:100%;object-fit:contain}",
      ".label{overflow:hidden;color:#000;text-overflow:ellipsis;white-space:nowrap;font-family:'Google Sans Flex',sans-serif;font-size:14px;font-weight:400;line-height:1.2}.brand{align-self:center;color:#6b7280;font-size:10px;line-height:1.2}.brand a{color:inherit;text-decoration:none}",
      "@media(max-width:480px){.wrap{right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));gap:6px}.pill{gap:4px;padding:7px 12px}.icon{width:28px;height:28px}.label{font-size:14px}.brand{font-size:10px}}",
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
    icon.innerHTML = whatsappIcon;
    brand.hidden = !config.poweredBy;
  }

  window.KilobotTraditionalWidget = { mount: mount };
})();
