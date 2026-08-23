import { expect, test } from "vitest";
import widgetHostScript from "../../../public/widget/ai.js?raw";

test("AI widget host creates one isolated iframe per public widget", () => {
  expect(widgetHostScript).toContain(
    "document.querySelector(\"iframe[data-kilobot-widget='\" + publicKey + \"']\")",
  );
  expect(widgetHostScript).toContain("document.createElement(\"iframe\")");
  expect(widgetHostScript).toContain("frame.dataset.kilobotWidget = publicKey");
  expect(widgetHostScript).toContain("document.body.appendChild(frame)");
});

test("AI widget host keeps the closed launcher compact and fits the open panel", () => {
  expect(widgetHostScript).toContain("right:16px;bottom:16px;width:52px;height:52px");
  expect(widgetHostScript).toContain(
    'frame.style.width = open ? "min(390px, calc(100vw - 24px))" : "52px"',
  );
  expect(widgetHostScript).toContain('"min(702px, calc(100vh - 24px))"');
  expect(widgetHostScript).toContain('"min(672px, calc(100vh - 24px))"');
});

test("AI widget host synchronizes open state and configuration with its iframe", () => {
  expect(widgetHostScript).toContain('type: "init"');
  expect(widgetHostScript).toContain('event.data.type === "state"');
  expect(widgetHostScript).toContain("frame.contentWindow.postMessage");
  expect(widgetHostScript).toContain("event.source !== frame.contentWindow");
});
