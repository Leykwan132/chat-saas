const offlinePage = new Response(
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Kilobot is offline</title><body><main><h1>You’re offline</h1><p>Reconnect to open your Kilobot workspace.</p><a href="/workspace">Try again</a></main></body></html>',
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
