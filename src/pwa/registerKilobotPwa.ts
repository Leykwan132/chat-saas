import { isNativeHost } from "@/lib/hostBranding";

export function registerKilobotPwa() {
  if (!isNativeHost(window.location.hostname)) return;

  for (const [rel, href] of [
    ["manifest", "/pwa/kilobot.webmanifest"],
    ["apple-touch-icon", "/pwa/icon-180.png"],
  ]) {
    const link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    document.head.append(link);
  }

  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    void navigator.serviceWorker
      .register("/kilobot-sw.js", { updateViaCache: "none" })
      .catch((error: unknown) =>
        console.error("Kilobot app registration failed", error),
      );
  }
}
