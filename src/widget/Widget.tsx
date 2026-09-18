import { useEffect, useRef, useState } from "react";
import { MessagesSquare } from "lucide-react";
import { DEFAULT_WEB_WIDGET_PROMPT_PLACEHOLDER } from "../../shared/webWidgetExperience";
import { getVisibleWebWidgetSuggestions } from "../../shared/webWidgetSuggestions";
import { isWidgetInit, type WidgetInit } from "./protocol";
import type { WidgetConfig, WidgetMessage, WidgetScreen, WidgetVisitorProfile } from "./types";
import { WidgetBranding } from "./WidgetBranding";
import { WidgetChatHeader } from "./WidgetChatHeader";
import { WidgetMessageScroller } from "./WidgetMessageScroller";
import { WidgetPromptInput } from "./WidgetPromptInput";
import { WidgetVisitorForm } from "./WidgetVisitorForm";
import { useWidgetReplyPolling } from "./useWidgetReplyPolling";
import { getWidgetEntryScreen } from "./widgetEntryScreen";
import { endpoint, json } from "./widgetHttp";

function hasReplyAfterLatestVisitorMessage(
  messages: WidgetMessage[],
  visitorMessage: string,
) {
  const visitorMessageIndex = messages.findLastIndex(
    (message) =>
      message.direction === "incoming" && message.content === visitorMessage,
  );
  return messages
    .slice(visitorMessageIndex + 1)
    .some((message) => message.direction === "outgoing");
}

export function Widget() {
  const [init, setInit] = useState<WidgetInit | null>(null);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [scrollToLatestRequest, setScrollToLatestRequest] = useState(0);
  const [screen, setScreen] = useState<WidgetScreen>("closed");
  const [profile, setProfile] = useState<WidgetVisitorProfile>({
    name: "",
    email: "",
    phone: "",
    customFields: {},
  });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const configRef = useRef<WidgetConfig | null>(null);
  const hasVisitorProfileRef = useRef(false);
  const openRequestedRef = useRef(false);
  const { isThinking, startThinking, stopThinking } = useWidgetReplyPolling(
    init,
    setMessages,
    screen === "chat",
  );
  const entryScreenFor = (next: WidgetConfig) =>
    getWidgetEntryScreen(next.leadForm.enabled, hasVisitorProfileRef.current);
  useEffect(() => {
    const parentOrigin = new URL(document.referrer).origin;
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== parentOrigin)
        return;
      if (isWidgetInit(event.data)) {
        setInit(event.data);
        return;
      }
      if (
        event.data?.source === "kilobot-host" &&
        event.data?.version === 1 &&
        event.data?.type === "command" &&
        event.data.command === "open"
      ) {
        openRequestedRef.current = true;
        if (configRef.current) {
          setScreen(entryScreenFor(configRef.current));
        }
      }
    };
    window.addEventListener("message", receive);
    window.parent.postMessage(
      { source: "kilobot-frame", version: 1, type: "ready" },
      parentOrigin,
    );
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    const parentOrigin = new URL(document.referrer).origin;
    window.parent.postMessage(
      {
        source: "kilobot-frame",
        version: 1,
        type: "state",
        open: screen !== "closed",
      },
      parentOrigin,
    );
  }, [screen]);

  useEffect(() => {
    if (!init) return;
    void json<WidgetConfig>(
      endpoint(init, "/widget/config", { key: init.publicKey }),
    )
      .then((next) => {
        configRef.current = next;
        setConfig(next);
        if (openRequestedRef.current) {
          setScreen(entryScreenFor(next));
        }
      })
      .catch(() => setError("We couldn’t load this chat."));
    void json<{ messages: WidgetMessage[] }>(
      endpoint(init, "/widget/messages", {
        key: init.publicKey,
        visitorId: init.visitorId,
      }),
    )
      .then(({ messages: next }) => setMessages(next))
      .catch(() => undefined);
    void json<{
      profile: {
        name: string | null;
        email: string | null;
        phone: string | null;
      } | null;
    }>(
      endpoint(init, "/widget/visitor", {
        key: init.publicKey,
        visitorId: init.visitorId,
      }),
    )
      .then(({ profile: next }) => {
        hasVisitorProfileRef.current = next !== null;
        if (!next) return;
        setProfile({
          name: next.name ?? "",
          email: next.email ?? "",
          phone: next.phone ?? "",
          customFields: {},
        });
        if (openRequestedRef.current && configRef.current?.leadForm.enabled) {
          setScreen("chat");
        }
      })
      .catch(() => undefined);
  }, [init]);

  const widgetOpen = screen !== "closed";
  const toggleWidget = () => {
    if (widgetOpen) {
      openRequestedRef.current = false;
      stopThinking();
      setScreen("closed");
      return;
    }
    openRequestedRef.current = true;
    if (configRef.current) {
      setScreen(entryScreenFor(configRef.current));
    }
  };
  const submitProfile = async () => {
    if (!init) return;
    try {
      await json(endpoint(init, "/widget/visitor"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: init.publicKey,
          visitorId: init.visitorId,
          ...profile,
        }),
      });
      hasVisitorProfileRef.current = true;
      setScreen("chat");
    } catch {
      setError("Please review your details and try again.");
    }
  };
  const send = async (text: string) => {
    const content = text.trim();
    if (!init || !content || isThinking) return;
    const sentAt = Date.now();
    setDraft("");
    setScrollToLatestRequest((current) => current + 1);
    setMessages((current) => [
      ...current,
      {
        id: `pending-${sentAt}`,
        direction: "incoming",
        sender: "visitor",
        content,
        createdAt: sentAt,
      },
    ]);
    try {
      const result = await json<{ messages: WidgetMessage[] }>(
        endpoint(init, "/widget/message"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicKey: init.publicKey,
            visitorId: init.visitorId,
            content,
            pageUrl: init.pageUrl,
          }),
        },
      );
      setMessages(result.messages);
      if (!hasReplyAfterLatestVisitorMessage(result.messages, content)) {
        startThinking(new Set(result.messages.map((message) => message.id)));
      }
    } catch {
      setError("Your message could not be sent. Please try again.");
    }
  };
  return (
    <div
      className={`widget-shell${init?.device === "mobile" ? " is-mobile" : ""}${widgetOpen ? " is-open" : ""}`}
    >
      {config && widgetOpen ? (
        <main className={`widget ${config.theme}`}>
          {screen === "form" ? (
            <WidgetVisitorForm
              leadForm={config.leadForm}
              profile={profile}
              onChange={setProfile}
              onSubmit={() => void submitProfile()}
            />
          ) : null}
          {screen === "chat" ? (
            <section
              className={`chat${config.poweredBy ? " has-branding" : ""}`}
            >
              <WidgetChatHeader
                displayName={config.agentDisplayName}
                iconUrl={config.iconUrl}
              />
              <WidgetMessageScroller
                isThinking={isThinking}
                messages={messages}
                onReplyVisible={stopThinking}
                scrollToLatestRequest={scrollToLatestRequest}
              />
              <WidgetPromptInput
                disabled={isThinking}
                value={draft}
                placeholder={DEFAULT_WEB_WIDGET_PROMPT_PLACEHOLDER}
                suggestions={getVisibleWebWidgetSuggestions(
                  config.suggestions,
                  config.suggestionsEnabled,
                  messages.length,
                )}
                onChange={setDraft}
                onSubmit={send}
              />
              {config.poweredBy ? <WidgetBranding /> : null}
            </section>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
        </main>
      ) : null}
      <button
        className="launcher"
        onClick={toggleWidget}
        aria-label={widgetOpen ? "Close chat" : "Open chat"}
      >
        {widgetOpen ? (
          "×"
        ) : config?.iconUrl ? (
          <img src={config.iconUrl} alt="" />
        ) : (
          <MessagesSquare size={28} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
