import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import widgetSource from "./Widget.tsx?raw";
import widgetHeaderSource from "./WidgetChatHeader.tsx?raw";
import widgetEntrySource from "./main.tsx?raw";
import promptInputSource from "./WidgetPromptInput.tsx?raw";
import messageScrollerSource from "./WidgetMessageScroller.tsx?raw";
import replyPollingSource from "./useWidgetReplyPolling.ts?raw";
import widgetHostSource from "../../public/widget/ai.js?raw";
import widgetHtmlSource from "../../widget.html?raw";
import { WidgetMessageScroller } from "./WidgetMessageScroller";

const widgetStyles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const widgetDialogStyles = readFileSync(
  new URL("./reset-dialog.css", import.meta.url),
  "utf8",
);
const thinkingIndicatorStyles = readFileSync(
  new URL("./thinking-indicator.css", import.meta.url),
  "utf8",
);

test("widget chat uses the shared text-only prompt input", () => {
  expect(widgetSource).toContain('from "./WidgetPromptInput"');
  expect(widgetSource).toContain("<WidgetPromptInput");
  expect(widgetSource).not.toContain('from "@/components/ai-elements/prompt-input"');
  expect(widgetSource).not.toContain('<input aria-label="Upload files"');
  expect(widgetSource).toContain("DEFAULT_WEB_WIDGET_PROMPT_PLACEHOLDER");
});

test("widget iframe keeps app-wide styles out of the embed", () => {
  expect(widgetEntrySource).not.toContain('import "../index.css"');
});

test("widget uses a white double-message icon on a black fallback surface", () => {
  const launcherStyles = widgetStyles.match(/\.launcher \{[^}]+\}/)?.[0] ?? "";

  expect(widgetSource).toContain('from "lucide-react"');
  expect(widgetSource).toContain("<MessagesSquare");
  expect(widgetHeaderSource).toContain("<MessagesSquare");
  expect(launcherStyles).toContain("display: grid;");
  expect(launcherStyles).toContain("place-items: center;");
  expect(launcherStyles).toContain("padding: 0;");
  expect(launcherStyles).toContain("background: #18181b;");
  expect(launcherStyles).toContain("color: #fff;");
  expect(widgetStyles).not.toContain(".launcher:hover");
  expect(widgetSource).not.toContain(' : "●"');
});

test("widget header offers a reset control backed by the reset endpoint", () => {
  expect(widgetHeaderSource).toContain("<RotateCcw");
  expect(widgetHeaderSource).toContain('aria-label="Reset chat"');
  expect(widgetSource).toContain('endpoint(init, "/widget/reset")');
});

test("widget asks for confirmation before resetting a chat", () => {
  expect(widgetSource).toContain('from "./WidgetResetDialog"');
  expect(widgetSource).toContain("setIsResetDialogOpen(true)");
  expect(widgetSource).toContain("<WidgetResetDialog");
});

test("widget iframe loads and uses Geist", () => {
  expect(widgetHtmlSource).toContain("family=Geist");
  expect(widgetStyles).toContain('font-family: "Geist"');
});

test("widget places required Kilobot branding beneath the prompt input", () => {
  expect(widgetSource).toContain('from "./WidgetBranding"');
  expect(widgetSource).toContain("config.poweredBy ? <WidgetBranding /> : null");
  expect(widgetDialogStyles).toContain(".widget-branding");
});

test("widget composer uses a compact prompt-input surface", () => {
  const composerStyles = widgetStyles.match(/\.composer \{[^}]+\}/)?.[0] ?? "";

  expect(promptInputSource).toContain('<div className="composer-actions">');
  expect(promptInputSource).toContain('element.style.height = "58px";');
  expect(widgetStyles).toContain(".composer-actions");
  expect(widgetStyles).toContain("position: absolute;");
  expect(composerStyles).toContain("border-radius: 12px;");
  expect(widgetStyles).toContain("justify-content: flex-end");
  expect(widgetStyles).toContain("height: 58px;");
});

test("widget submits configured suggestions from content-sized vertical pills before the first message", () => {
  expect(widgetSource).toContain('from "../../shared/webWidgetSuggestions"');
  expect(widgetSource).toContain("getVisibleWebWidgetSuggestions");
  expect(promptInputSource).toContain("suggestions: string[]");
  expect(promptInputSource).toContain('className="widget-suggestions"');
  expect(promptInputSource).toContain("void onSubmit(suggestion)");
  expect(widgetStyles).toMatch(
    /\.widget-suggestions \{[^}]+display: flex;[^}]+flex-direction: column;[^}]+align-items: flex-start;/,
  );
  expect(widgetStyles).toMatch(
    /\.widget-suggestions button \{[^}]+width: auto;[^}]+max-width: 100%;[^}]+white-space: normal;/,
  );
});

test("widget transcript uses the Message Scroller primitive through its local adapter", () => {
  expect(widgetSource).toContain('from "./WidgetMessageScroller"');
  expect(widgetSource).toContain("<WidgetMessageScroller");
  expect(widgetSource).not.toContain('<div className="messages">');
  expect(widgetSource).not.toContain('from "@/components/ui/message-scroller"');
});

test("widget transcript keeps auto scroll without a manual jump control", () => {
  expect(messageScrollerSource).toContain("autoScroll");
  expect(messageScrollerSource).not.toContain("defaultScrollPosition");
  expect(messageScrollerSource).not.toContain("<MessageScroller.Button");
  expect(widgetStyles).not.toContain(".messages-latest");
});

test("widget transcript starts with saved conversation messages only", () => {
  expect(messageScrollerSource).not.toContain("initialMessage");
  expect(messageScrollerSource).not.toContain('id: "initial-message"');
  expect(widgetSource).not.toContain("config.home.initialMessage");
});

test("widget skips an enabled visitor form after the same visitor has a saved profile", () => {
  expect(widgetSource).toContain('from "./widgetEntryScreen"');
  expect(widgetSource).toContain("hasVisitorProfileRef.current = next !== null");
  expect(widgetSource).toContain("getWidgetEntryScreen");
});

test("widget transcript shows an empty state only before the first message", () => {
  const emptyTranscript = renderToStaticMarkup(
    createElement(WidgetMessageScroller, { messages: [] }),
  );
  const activeTranscript = renderToStaticMarkup(
    createElement(WidgetMessageScroller, {
      messages: [
        {
          id: "visitor-1",
          direction: "incoming",
          sender: "visitor",
          content: "Can you help me?",
          createdAt: 1,
        },
      ],
    }),
  );

  expect(emptyTranscript).toContain("How can we help?");
  expect(emptyTranscript).toContain("messages-content is-empty");
  expect(emptyTranscript).toContain("empty-state full-width full-height");
  expect(emptyTranscript).toContain("Ask a question to start the conversation.");
  expect(emptyTranscript).toContain("svg");
  expect(emptyTranscript).not.toContain("empty-state-title");
  expect(widgetStyles).toMatch(
    /\.empty-state \{[^}]+display: grid;[^}]+place-items: center;/,
  );
  expect(widgetStyles).toMatch(/\.empty-state \{[^}]+height: 100%;/);
  expect(widgetStyles).toMatch(/\.empty-state-header \{[^}]+display: grid;/);
  expect(widgetStyles).toMatch(/\.empty-state p \{[^}]+font-size: 17px;/);
  expect(widgetStyles).toMatch(
    /\.messages-viewport \{[^}]+position: relative;/,
  );
  expect(widgetStyles).toMatch(
    /\.messages-content\.is-empty \{[^}]+position: absolute;[^}]+inset: 0;/,
  );
  expect(activeTranscript).not.toContain("How can we help?");
  expect(activeTranscript).toContain("Can you help me?");
});

test("widget opens without a panel animation", () => {
  expect(widgetHostSource).not.toContain("transition:width 220ms");
  expect(widgetStyles).not.toContain("@keyframes widget-open");
});

test("widget transcript shows the thinking indicator while awaiting an assistant reply", () => {
  const thinkingTranscript = renderToStaticMarkup(
    createElement(
      WidgetMessageScroller,
      {
        messages: [
          {
            id: "visitor-1",
            direction: "incoming",
            content: "Can you help me?",
            createdAt: 1,
          },
        ],
        isThinking: true,
      } as never,
    ),
  );

  expect(thinkingTranscript).toContain("Thinking…");
  expect(thinkingIndicatorStyles).toMatch(
    /\.thinking-label \{[^}]+font-size: 14px;/,
  );
  expect(thinkingIndicatorStyles).toMatch(
    /\.thinking-indicator \{[^}]+gap: 10px;/,
  );
  expect(thinkingIndicatorStyles).toMatch(
    /\.thinking-label \{[^}]+transform: translateY\(1px\);/,
  );
});

test("widget identifies human replies by member name", () => {
  const transcript = renderToStaticMarkup(
    createElement(
      WidgetMessageScroller,
      {
        messages: [
          {
            id: "ai-1",
            direction: "outgoing",
            sender: "ai",
            content: "An automated reply",
            createdAt: 1,
          },
          {
            id: "team-1",
            direction: "outgoing",
            sender: "team",
            senderName: "Jordan Lee",
            content: "A team reply",
            createdAt: 2,
          },
        ],
      } as never,
    ),
  );

  expect(transcript).toContain("AI Agent");
  expect(transcript).toContain("Jordan Lee");
  expect(transcript).not.toContain("Support Team");
  expect(transcript).not.toContain("·");
  expect(transcript.indexOf("AI Agent")).toBeLessThan(
    transcript.indexOf("An automated reply"),
  );
  expect(transcript.indexOf("Jordan Lee")).toBeLessThan(
    transcript.indexOf("A team reply"),
  );
  expect(transcript.indexOf("An automated reply")).toBeLessThan(
    transcript.indexOf('dateTime="1970-01-01T00:00:00.001Z"'),
  );
});

test("widget shows a timestamp for visitor and agent messages", () => {
  const transcript = renderToStaticMarkup(
    createElement(
      WidgetMessageScroller,
      {
        messages: [
          {
            id: "visitor-1",
            direction: "incoming",
            sender: "visitor",
            content: "Can you help me?",
            createdAt: 0,
          },
          {
            id: "agent-1",
            direction: "outgoing",
            sender: "ai",
            content: "Absolutely.",
            createdAt: 60_000,
          },
        ],
      } as never,
    ),
  );
  const timestamps = [...transcript.matchAll(/<time[^>]*>([^<]+)<\/time>/g)];

  expect(timestamps).toHaveLength(2);
  expect(timestamps.every(([, timestamp]) => timestamp.trim().length > 0)).toBe(true);
});

test("widget keeps the thinking indicator active while it polls for an AI reply", () => {
  expect(widgetSource).toContain('from "./useWidgetReplyPolling"');
  expect(widgetSource).toContain("startThinking(sentAt)");
  expect(widgetSource).toContain("disabled={isThinking}");
});

test("widget refreshes agent replies while its chat is open", () => {
  expect(widgetSource).toMatch(
    /useWidgetReplyPolling\(\s*init,\s*setMessages,\s*screen === "chat",\s*\)/,
  );
  expect(replyPollingSource).toContain("window.setInterval");
});

test("widget card and launcher share one iframe geometry", () => {
  expect(widgetHostSource).toContain('"min(390px, calc(100vw - 24px))"');
  expect(widgetStyles).toContain("width: 100vw;");
  expect(widgetStyles).toContain("height: 100dvh;");
  expect(widgetStyles).toContain("width: 100%;");
  expect(widgetStyles).toContain("height: min(620px, calc(100dvh - 64px));");
  expect(widgetStyles).toContain("bottom: 64px;");
  expect(widgetStyles).toContain("width: 52px;");
  expect(widgetStyles).toContain("height: 52px;");
  expect(widgetStyles).not.toContain(".launcher:hover");
  expect(widgetStyles).not.toContain("transform: scale(");
  expect(widgetHostSource).toContain("width:52px;height:52px");
});

test("widget chat copy uses a compact type scale", () => {
  expect(widgetStyles).toMatch(/\.messages p \{[^}]+font-size: 14px;/);
  expect(widgetStyles).toMatch(/\.composer textarea \{[^}]+font-size: 14px;/);
});

test("widget message bubbles size to their content", () => {
  const bubbleStyles = widgetStyles.match(/\.messages p \{[^}]+\}/)?.[0] ?? "";

  expect(bubbleStyles).toContain("width: fit-content;");
  expect(bubbleStyles).toContain("white-space: pre-wrap;");
  expect(bubbleStyles).toContain("overflow-wrap: anywhere;");
  expect(widgetStyles).toMatch(
    /\.message-row\.outgoing \{[^}]+justify-items: start;/,
  );
});

test("widget composer keeps its text and send control comfortably inset", () => {
  const composerStyles = widgetStyles.match(/\.composer \{[^}]+\}/)?.[0] ?? "";
  const composerTextareaStyles =
    widgetStyles.match(/\.composer textarea \{[^}]+\}/)?.[0] ?? "";

  expect(composerStyles).toContain("padding: 10px 12px 8px;");
  expect(composerTextareaStyles).toContain("padding: 0 42px 0 0;");
  expect(composerTextareaStyles).toContain("border-radius: 0;");
  expect(composerTextareaStyles).toContain("background: transparent;");
  expect(widgetStyles).toMatch(/\.composer-actions \{[^}]+right: 12px;/);
  expect(widgetStyles).toMatch(/\.composer-actions \{[^}]+bottom: 10px;/);
});

test("widget card does not cast a shadow into the launcher gap", () => {
  expect(widgetStyles).not.toContain("box-shadow: 0 20px 55px #0007;");
});

test("widget uses borders instead of card or launcher shadows", () => {
  expect(widgetStyles).not.toContain("box-shadow: 0 12px 30px #0004;");
  expect(widgetStyles).toContain("border: 1px solid #3f3f46;");
  expect(widgetStyles).toContain("border-color: #d4d4d8;");
});

test("light widget headers use a soft divider and normal-weight title", () => {
  expect(widgetStyles).toMatch(
    /\.widget\.light header \{\s*border-color: #e4e4e7;/,
  );
  expect(widgetStyles).toMatch(
    /\.chat header strong \{\s*font-weight: 400;/,
  );
});

test("widget renders visitor messages black and outbound replies neutrally", () => {
  const outboundMessageStyles =
    widgetStyles.match(/\.messages p\.outgoing \{[^}]+\}/)?.[0] ?? "";
  const visitorMessageStyles =
    widgetStyles.match(/\.messages p\.incoming \{[^}]+\}/)?.[0] ?? "";

  expect(outboundMessageStyles).toContain("background: #f4f4f5;");
  expect(outboundMessageStyles).toContain("color: #18181b;");
  expect(visitorMessageStyles).toContain("background: #18181b;");
  expect(visitorMessageStyles).toContain("color: #fff;");
});
