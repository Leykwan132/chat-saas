import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, test, vi } from "vitest";

function workerFixture() {
  const handlers = new Map<string, (event: unknown) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const client = {
    url: "https://kilobot.app/workspace",
    navigate: vi.fn().mockResolvedValue(undefined),
    focus: vi.fn().mockResolvedValue(undefined),
  };
  const clients = {
    matchAll: vi.fn().mockResolvedValue([client]),
    openWindow: vi.fn().mockResolvedValue(undefined),
    claim: vi.fn(),
  };
  runInNewContext(
    readFileSync(
      new URL("../../public/kilobot-sw.js", import.meta.url),
      "utf8",
    ),
    {
      URL,
      Response,
      fetch: vi.fn(),
      self: {
        location: { origin: "https://kilobot.app" },
        addEventListener: (kind: string, handler: (event: unknown) => void) =>
          handlers.set(kind, handler),
        registration: { showNotification },
        clients,
        skipWaiting: vi.fn(),
      },
    },
  );
  return { handlers, showNotification, clients, client };
}

test("push displays a notification with a same-origin destination and return marker", async () => {
  const { handlers, showNotification } = workerFixture();
  let work: Promise<unknown> | undefined;
  handlers.get("push")!({
    data: {
      json: () => ({
        title: "Kilobot",
        body: "Needs attention",
        tag: "event-one",
        url: "https://kilobot.app/dashboard/agent/inbox?conversation=one",
      }),
    },
    waitUntil: (promise: Promise<unknown>) => {
      work = promise;
    },
  });
  await work;
  expect(showNotification).toHaveBeenCalledWith(
    "Kilobot",
    expect.objectContaining({
      body: "Needs attention",
      tag: "event-one",
      data: {
        url: "https://kilobot.app/dashboard/agent/inbox?conversation=one&fromPush=1",
      },
    }),
  );
});

test("rejects cross-origin push destinations", () => {
  const { handlers, showNotification } = workerFixture();
  expect(() =>
    handlers.get("push")!({
      data: {
        json: () => ({
          title: "Alert",
          body: "Body",
          url: "https://attacker.test/dashboard/one",
        }),
      },
      waitUntil: vi.fn(),
    }),
  ).toThrow("Invalid push notification destination");
  expect(showNotification).not.toHaveBeenCalled();
});

test("notification clicks reuse a window and never open another origin", async () => {
  const { handlers, client, clients } = workerFixture();
  let work: Promise<unknown> | undefined;
  const target = "https://kilobot.app/dashboard/agent/inbox?conversation=one";
  handlers.get("notificationclick")!({
    notification: { close: vi.fn(), data: { url: target } },
    waitUntil: (promise: Promise<unknown>) => {
      work = promise;
    },
  });
  await work;
  expect(client.navigate).toHaveBeenCalledWith(target);
  expect(client.focus).toHaveBeenCalled();
  handlers.get("notificationclick")!({
    notification: {
      close: vi.fn(),
      data: { url: "https://attacker.test/dashboard/one" },
    },
    waitUntil: vi.fn(),
  });
  expect(clients.openWindow).not.toHaveBeenCalled();
});

test("notification clicks open a new app window when none exists", async () => {
  const { handlers, clients } = workerFixture();
  clients.matchAll.mockResolvedValue([]);
  let work: Promise<unknown> | undefined;
  handlers.get("notificationclick")!({
    notification: {
      close: vi.fn(),
      data: { url: "/dashboard/agent/calendar" },
    },
    waitUntil: (promise: Promise<unknown>) => {
      work = promise;
    },
  });
  await work;
  expect(clients.openWindow).toHaveBeenCalledWith(
    "https://kilobot.app/dashboard/agent/calendar",
  );
});
