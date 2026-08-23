import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { DEFAULT_WEB_WIDGET_LEAD_FORM } from "../../../shared/webWidgetExperience";
import { EMPTY_WEB_WIDGET_SUGGESTIONS } from "../../../shared/webWidgetSuggestions";
import previewChatSource from "./WebWidgetPreviewChat.tsx?raw";
import previewFrameSource from "./WebWidgetPreviewFrame.tsx?raw";
import previewSource from "./WebWidgetPreview.tsx?raw";
import settingsControlsSource from "./WebWidgetAiSettingsControls.tsx?raw";
import { WebWidgetPreviewChat } from "./WebWidgetPreviewChat";
import { WebWidgetPreviewEmptyState } from "./WebWidgetPreviewEmptyState";
import { WebWidgetPreview } from "./WebWidgetPreview";

test("dashboard preview uses the Message Scroller primitive for its transcript", () => {
  expect(previewChatSource).toContain(
    'from "@shadcn/react/message-scroller"',
  );
  expect(previewChatSource).toContain("<MessageScroller.Provider");
  expect(previewChatSource).toContain("<MessageScroller.Viewport");
  expect(previewChatSource).not.toContain("<MessageScroller.Button");
  expect(previewChatSource).not.toContain("defaultScrollPosition");
  expect(previewChatSource).toContain('scrollAnchor={message.direction === "visitor"}');
  expect(previewChatSource).not.toContain(
    '<div className="grid content-end gap-3 overflow-y-auto p-4">',
  );
});

test("dashboard preview uses the compact prompt-input surface", () => {
  expect(previewChatSource).toContain(
    '"m-3 grid rounded-2xl border px-3 pb-2 pt-2.5"',
  );
  expect(previewChatSource).toContain("min-h-[58px]");
  expect(previewChatSource).toContain("bg-transparent p-0 text-sm");
  expect(previewChatSource).toContain("justify-end");
  expect(previewChatSource).toContain("rounded-full bg-blue-500");
  expect(previewChatSource).not.toContain('"flex gap-2 border-t p-3"');
  expect(previewSource).toContain("DEFAULT_WEB_WIDGET_PROMPT_PLACEHOLDER");
});

test("dashboard preview submits content-sized suggestions before the first message", () => {
  expect(previewChatSource).toContain('from "../../../shared/webWidgetSuggestions"');
  expect(previewChatSource).toContain("getVisibleWebWidgetSuggestions");
  expect(previewChatSource).toContain("onSelectSuggestion");
  expect(previewSource).toContain("onSelectSuggestion={sendSuggestion}");
  expect(previewChatSource).toContain('className="flex flex-col items-start gap-2 px-3"');
  expect(previewChatSource).toContain('"max-w-full rounded-full border px-3 py-1.5 text-left text-xs"');
});

test("dashboard preview chat header omits a presence indicator", () => {
  expect(previewChatSource).not.toContain("bg-emerald-500");
});

test("dashboard preview uses a white double-message icon on black", () => {
  expect(previewSource).toContain("<MessagesSquare");
  expect(previewChatSource).toContain("<MessagesSquare");
  expect(previewSource).toContain("bg-zinc-950 text-white");
  expect(previewChatSource).toContain("bg-zinc-950 text-white");
});

test("dashboard preview renders the configured avatar in its closed launcher", () => {
  const preview = renderToStaticMarkup(
    createElement(WebWidgetPreview, {
      agentName: "Kilobot",
      iconUrl: "https://cdn.example.test/kilobot-avatar.png",
      leadForm: DEFAULT_WEB_WIDGET_LEAD_FORM,
      suggestions: EMPTY_WEB_WIDGET_SUGGESTIONS,
      suggestionsEnabled: false,
      poweredBy: false,
      theme: "light",
    }),
  );

  expect(preview).toContain('src="https://cdn.example.test/kilobot-avatar.png"');
});

test("dashboard preview chat header uses a normal-weight title", () => {
  expect(previewChatSource).toContain('className="truncate text-sm"');
  expect(previewChatSource).not.toContain("truncate text-sm font-medium");
});

test("dashboard preview chat header offers a reset control", () => {
  expect(previewChatSource).toContain("RotateCcw");
  expect(previewChatSource).toContain("onRequestReset");
  expect(previewChatSource).toContain('aria-label="Reset preview chat"');
});

test("dashboard preview starts without a seeded assistant greeting", () => {
  expect(previewSource).not.toContain("home.initialMessage");
  expect(previewSource).not.toContain("const chatMessages");
});

test("dashboard preview centers the empty chat state in the transcript area", () => {
  expect(previewChatSource).toContain("WebWidgetPreviewEmptyState");
  expect(previewChatSource).toMatch(
    /messages\.length === 0\s*\? "grid h-full min-h-full place-items-stretch p-0"/,
  );
  expect(previewChatSource).toContain('className="relative h-full min-h-0"');
});

test("dashboard preview fills and centers its empty-state content", () => {
  const emptyPreview = renderToStaticMarkup(
    createElement(WebWidgetPreviewEmptyState, { subduedTextClassName: "text-zinc-500" }),
  );

  expect(emptyPreview).toContain("How can we help?");
  expect(emptyPreview).toContain("Ask a question to start the conversation.");
  expect(emptyPreview).toContain("data-slot=\"empty\"");
  expect(emptyPreview).toContain("h-full");
  expect(emptyPreview).toContain("data-slot=\"empty-header\"");
  expect(emptyPreview).toContain("<svg");
});

test("dashboard preview opens without a panel animation", () => {
  expect(previewSource).not.toContain("web-widget-preview-card");
});

test("dashboard preview uses a compact desktop panel", () => {
  expect(previewSource).toContain('"right-0 h-[620px] w-[390px]"');
  expect(previewSource).toContain("bottom-[64px]");
  expect(previewSource).toContain("bottom-0 right-0 flex size-[52px]");
  expect(previewSource).not.toContain("hover:scale-[1.115]");
  expect(previewFrameSource).toContain('"mx-auto w-full max-w-[480px]"');
  expect(previewFrameSource).toContain("ratio={mobile ? 6 / 13 : 2 / 3}");
  expect(previewFrameSource).toContain('mobile ? "min-h-[620px] items-start"');
});

test("dashboard preview confirms a chat reset before clearing messages", () => {
  expect(previewSource).toContain("WebWidgetPreviewResetDialog");
  expect(previewSource).toContain("setIsResetDialogOpen(true)");
});

test("dashboard preview places required Kilobot branding beneath its prompt", () => {
  expect(settingsControlsSource).toContain(
    "poweredBy={!canHideBranding || !hidePoweredBy}",
  );
  expect(previewChatSource).toContain("poweredBy");
  expect(previewChatSource).toContain("Powered by");
});

test("AI widget settings omit the retired first-message editor", () => {
  expect(settingsControlsSource).not.toContain("WebWidgetHomeSection");
  expect(settingsControlsSource).not.toContain("canSaveHome");
});

test("dashboard preview renders visitor messages black and outbound replies neutrally", () => {
  expect(previewChatSource).toContain(
    '"bg-zinc-950 text-white"',
  );
  expect(previewChatSource).toContain(
    '"bg-zinc-100 text-zinc-950"',
  );
});

test("dashboard preview sizes message bubbles to their content", () => {
  expect(previewChatSource).toContain(
    '"w-fit max-w-[84%] rounded-2xl px-3 py-2 text-sm leading-5"',
  );
});

test("dashboard preview labels its sample reply as AI-generated", () => {
  const preview = renderToStaticMarkup(
    createElement(
      WebWidgetPreviewChat,
      {
        borderClassName: "border-zinc-200",
        dark: false,
        displayName: "Agent",
        draft: "",
        messages: [
          { direction: "agent", sender: "ai", content: "Hello", createdAt: 0 },
        ],
        placeholder: "Ask a question",
        poweredBy: false,
        subduedTextClassName: "text-zinc-500",
        onDraftChange: () => undefined,
        onRequestReset: () => undefined,
        onSend: () => undefined,
        isThinking: false,
      } as never,
    ),
  );

  expect(preview).toContain("AI Agent");
  expect(preview.indexOf("AI Agent")).toBeLessThan(preview.indexOf("Hello"));
  expect(preview.indexOf("Hello")).toBeLessThan(
    preview.indexOf('dateTime="1970-01-01T00:00:00.000Z"'),
  );
});

test("dashboard preview shows timestamps for visitor and agent messages", () => {
  const preview = renderToStaticMarkup(
    createElement(
      WebWidgetPreviewChat,
      {
        borderClassName: "border-zinc-200",
        dark: false,
        displayName: "Agent",
        draft: "",
        messages: [
          { direction: "visitor", sender: "visitor", content: "Hello", createdAt: 0 },
          { direction: "agent", sender: "ai", content: "Hi there", createdAt: 60_000 },
        ],
        placeholder: "Ask a question",
        poweredBy: false,
        subduedTextClassName: "text-zinc-500",
        onDraftChange: () => undefined,
        onRequestReset: () => undefined,
        onSend: () => undefined,
        isThinking: false,
      } as never,
    ),
  );
  const timestamps = [...preview.matchAll(/<time[^>]*>([^<]+)<\/time>/g)];

  expect(timestamps).toHaveLength(2);
  expect(timestamps.every(([, timestamp]) => timestamp.trim().length > 0)).toBe(true);
});

test("dashboard preview shows the thinking indicator before its sample reply", () => {
  const preview = renderToStaticMarkup(
    createElement(
      WebWidgetPreviewChat,
      {
        borderClassName: "border-zinc-200",
        dark: false,
        displayName: "Agent",
        draft: "",
        messages: [
          { direction: "visitor", sender: "visitor", content: "Hello", createdAt: 0 },
        ],
        placeholder: "Ask a question",
        poweredBy: false,
        subduedTextClassName: "text-zinc-500",
        onDraftChange: () => undefined,
        onRequestReset: () => undefined,
        onSend: () => undefined,
        isThinking: true,
      } as never,
    ),
  );

  expect(preview).toContain("Thinking…");
});
