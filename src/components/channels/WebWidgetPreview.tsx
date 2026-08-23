import { useEffect, useRef, useState, type FormEvent } from "react";
import { Globe, MessagesSquare, X } from "lucide-react";
import type {
  WebWidgetLeadForm,
} from "../../../shared/webWidgetExperience";
import { DEFAULT_WEB_WIDGET_PROMPT_PLACEHOLDER } from "../../../shared/webWidgetExperience";
import type { WebWidgetTheme } from "../../../shared/webWidgetThemes";
import type { WebWidgetSuggestions } from "../../../shared/webWidgetSuggestions";
import { cn } from "@/lib/utils";
import {
  getModernWidgetPreviewEntryScreen,
  getWidgetLauncherLabel,
} from "./webWidgetConfigurationState";
import {
  WebWidgetPreviewDeviceToggle,
  type WebWidgetPreviewDevice,
} from "./WebWidgetPreviewDeviceToggle";
import { WebWidgetPreviewFrame } from "./WebWidgetPreviewFrame";
import { WebWidgetPreviewChat } from "./WebWidgetPreviewChat";
import { WebWidgetPreviewForm } from "./WebWidgetPreviewForm";
import { WebWidgetPreviewResetDialog } from "./WebWidgetPreviewResetDialog";

type PreviewScreen = "form" | "chat";

type PreviewMessage = {
  direction: "agent" | "visitor";
  sender: "ai" | "team" | "visitor";
  content: string;
  createdAt: number;
};

type WebWidgetPreviewProps = {
  agentName: string;
  iconUrl?: string;
  leadForm: WebWidgetLeadForm;
  suggestions: WebWidgetSuggestions;
  suggestionsEnabled: boolean;
  poweredBy: boolean;
  theme: WebWidgetTheme;
  className?: string;
};

export function WebWidgetPreview({
  agentName,
  iconUrl,
  leadForm,
  suggestions,
  suggestionsEnabled,
  poweredBy,
  theme,
  className,
}: WebWidgetPreviewProps) {
  const [device, setDevice] = useState<WebWidgetPreviewDevice>("desktop");
  const [screen, setScreen] = useState<PreviewScreen>("chat");
  const [isOpen, setIsOpen] = useState(false);
  const [hasVisitorProfile, setHasVisitorProfile] = useState(false);
  const [messages, setMessages] = useState<PreviewMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const replyTimerRef = useRef<number | undefined>(undefined);
  const dark = theme === "dark";
  const displayName = agentName.trim() || "AI Agent";
  const mobile = device === "mobile";
  const panelClassName = cn(
    "absolute bottom-[64px] overflow-hidden rounded-xl shadow-2xl",
    dark ? "bg-zinc-900 text-zinc-100" : "bg-white text-zinc-950",
    mobile
      ? "bottom-[64px] right-0 h-[650px] w-[336px] max-w-[calc(100%-1rem)]"
      : "right-0 h-[620px] w-[390px]",
  );
  const borderClassName = dark ? "border-white/10" : "border-zinc-200";
  const subduedTextClassName = dark ? "text-zinc-400" : "text-zinc-500";
  const beginConversation = () => {
    setScreen(
      getModernWidgetPreviewEntryScreen({
        leadFormEnabled: leadForm.enabled,
        hasVisitorProfile,
      }),
    );
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasVisitorProfile(true);
    setScreen("chat");
  };

  const stopThinking = () => {
    if (replyTimerRef.current !== undefined) {
      window.clearTimeout(replyTimerRef.current);
      replyTimerRef.current = undefined;
    }
    setIsThinking(false);
  };

  useEffect(
    () => () => {
      if (replyTimerRef.current !== undefined) {
        window.clearTimeout(replyTimerRef.current);
      }
    },
    [],
  );

  const sendMessageContent = (value: string) => {
    const content = value.trim();
    if (!content || isThinking) return;
    setDraft("");
    setMessages((current) => [
      ...current,
      { direction: "visitor", sender: "visitor", content, createdAt: Date.now() },
    ]);
    setIsThinking(true);
    replyTimerRef.current = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          direction: "agent",
          sender: "ai",
          content: `Thanks for reaching out. ${displayName} will help from here.`,
          createdAt: Date.now(),
        },
      ]);
      replyTimerRef.current = undefined;
      setIsThinking(false);
    }, 700);
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessageContent(draft);
  };

  const sendSuggestion = (suggestion: string) => {
    sendMessageContent(suggestion);
  };

  return (
    <div
      className={cn(
        "relative flex min-h-[620px] flex-1 flex-col gap-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Preview</span>
        </div>
        <WebWidgetPreviewDeviceToggle value={device} onChange={setDevice} />
      </div>
      <WebWidgetPreviewFrame
        device={device}
        onPointerDownCapture={() => undefined}
      >
        <div
          className={cn(
            "relative h-full w-full",
            mobile ? "max-w-[390px]" : "",
          )}
        >
          {isOpen ? (
            <section className={panelClassName}>
              {screen === "form" ? (
                <WebWidgetPreviewForm
                  borderClassName={borderClassName}
                  leadForm={leadForm}
                  subduedTextClassName={subduedTextClassName}
                  onSubmit={submitProfile}
                />
              ) : null}
              {screen === "chat" ? (
                <WebWidgetPreviewChat
                  borderClassName={borderClassName}
                  dark={dark}
                  displayName={displayName}
                  draft={draft}
                  iconUrl={iconUrl}
                  messages={messages}
                  placeholder={DEFAULT_WEB_WIDGET_PROMPT_PLACEHOLDER}
                  suggestions={suggestions}
                  suggestionsEnabled={suggestionsEnabled}
                  poweredBy={poweredBy}
                  isThinking={isThinking}
                  subduedTextClassName={subduedTextClassName}
                  onDraftChange={setDraft}
                  onRequestReset={() => setIsResetDialogOpen(true)}
                  onSelectSuggestion={sendSuggestion}
                  onSend={sendMessage}
                />
              ) : null}
              {isResetDialogOpen ? (
                <WebWidgetPreviewResetDialog
                  dark={dark}
                  onCancel={() => setIsResetDialogOpen(false)}
                  onConfirm={() => {
                    stopThinking();
                    setDraft("");
                    setMessages([]);
                    setIsResetDialogOpen(false);
                  }}
                />
              ) : null}
            </section>
          ) : null}
          <button
            type="button"
            className="absolute bottom-0 right-0 flex size-[52px] items-center justify-center rounded-full bg-zinc-950 text-white"
            aria-label={getWidgetLauncherLabel(isOpen)}
            onClick={() => {
              setIsOpen((open) => {
                if (!open) beginConversation();
                if (open) stopThinking();
                return !open;
              });
            }}
          >
            {isOpen ? (
              <X className="size-6" />
            ) : iconUrl ? (
              <img
                src={iconUrl}
                alt=""
                className="size-full rounded-full object-cover"
              />
            ) : (
              <MessagesSquare className="size-6" />
            )}
          </button>
        </div>
      </WebWidgetPreviewFrame>
    </div>
  );
}
