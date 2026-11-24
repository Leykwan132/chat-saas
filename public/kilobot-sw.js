const offlinePage = new Response(
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Workspace is offline</title><body><main><h1>You’re offline</h1><p>Reconnect to open your workspace.</p><a href="/workspace">Try again</a></main></body></html>',
  {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  },
);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.mode !== "navigate" ||
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname !== "/workspace"
  ) {
    return;
  }

  event.respondWith(fetch(request).catch(() => offlinePage.clone()));
});

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json();
  if (
    !payload ||
    typeof payload.title !== "string" ||
    typeof payload.body !== "string" ||
    typeof payload.url !== "string"
  ) {
    throw new Error("Invalid push notification payload");
  }
  const url = new URL(payload.url, self.location.origin);
  if (
    url.origin !== self.location.origin ||
    !url.pathname.startsWith("/dashboard/")
  ) {
    throw new Error("Invalid push notification destination");
  }
  url.searchParams.set("fromPush", "1");
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: typeof payload.icon === "string" ? payload.icon : undefined,
      tag: typeof payload.tag === "string" ? payload.tag : undefined,
      data: { url: url.toString() },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const value = event.notification.data?.url;
  if (typeof value !== "string") return;
  const url = new URL(value, self.location.origin);
  if (
    url.origin !== self.location.origin ||
    !url.pathname.startsWith("/dashboard/")
  )
    return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing =
        windows.find((client) => client.url === url.toString()) ??
        windows.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );
      if (existing) {
        await existing.navigate(url.toString());
        await existing.focus();
      } else {
        await self.clients.openWindow(url.toString());
      }
    })(),
  );
});
