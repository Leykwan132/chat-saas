import { expect, test } from "vitest";
import widgetScript from "../../../public/widget/ai.js?raw";

function mountWidget() {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const messages: Array<{ payload: Record<string, unknown>; origin: string }> = [];
  const frame = {
    dataset: {} as Record<string, string>,
    title: "",
    src: "",
    style: { cssText: "", width: "", height: "" },
    contentWindow: {
      postMessage: (payload: Record<string, unknown>, origin: string) => {
        messages.push({ payload, origin });
      },
    },
  };
  const script = {
    src: "https://widget.example/widget/ai.js",
    getAttribute: (name: string) =>
      name === "data-kilobot-widget" ? "public-key" : null,
  };
  const document = {
    currentScript: script,
    querySelector: () => null,
    createElement: () => frame,
    body: { appendChild: () => undefined },
  };
  const window = {
    addEventListener: (name: string, listener: (event: Record<string, unknown>) => void) => {
      listeners.set(name, listener);
    },
    matchMedia: () => ({ matches: false }),
    KilobotWidget: undefined as { open: () => void } | undefined,
  };
  const localStorage = { getItem: () => null, setItem: () => undefined };
  const crypto = { randomUUID: () => "visitor-id" };
  const location = { href: "https://customer.example/pricing" };

  new Function("document", "window", "localStorage", "crypto", "location", widgetScript)(
    document,
    window,
    localStorage,
    crypto,
    location,
  );

  return { frame, listeners, messages, window };
}

test("embeds one isolated widget frame and initializes it after readiness", () => {
  const { frame, listeners, messages } = mountWidget();

  expect(frame.dataset.kilobotWidget).toBe("public-key");
  expect(frame.title).toBe("Kilobot chat");
  expect(frame.src).toBe("https://widget.example/widget.html");
  listeners.get("message")?.({
    origin: "https://widget.example",
    source: frame.contentWindow,
    data: { source: "kilobot-frame", type: "ready" },
  });

  expect(messages).toEqual([
    {
      payload: expect.objectContaining({
        source: "kilobot-host",
        type: "init",
        publicKey: "public-key",
        visitorId: "visitor-id",
        pageUrl: "https://customer.example/pricing",
        device: "desktop",
      }),
      origin: "https://widget.example",
    },
  ]);
});

test("opens and closes the host frame from widget state", () => {
  const { frame, listeners, messages, window } = mountWidget();

  window.KilobotWidget?.open();
  expect(frame.style.width).toBe("min(390px, calc(100vw - 24px))");
  expect(frame.style.height).toBe("min(672px, calc(100vh - 24px))");
  expect(messages.at(-1)).toEqual({
    payload: { source: "kilobot-host", version: 1, type: "command", command: "open" },
    origin: "https://widget.example",
  });

  listeners.get("message")?.({
    origin: "https://widget.example",
    source: frame.contentWindow,
    data: { source: "kilobot-frame", type: "state", open: false },
  });
  expect(frame.style.width).toBe("52px");
  expect(frame.style.height).toBe("52px");
});
