export function registerKilobotPwa() {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    void navigator.serviceWorker
      .register("/kilobot-sw.js", { updateViaCache: "none" })
      .catch((error: unknown) =>
        console.error("Kilobot app registration failed", error),
      );
  }
}
