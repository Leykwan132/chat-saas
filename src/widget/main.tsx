import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { isWidgetInit, type WidgetInit } from "./protocol";
import "./styles.css";

type Config = {
  agentDisplayName: string;
  theme: "dark" | "light";
  placeholder: string;
  poweredBy: boolean;
  home: { greeting: string; introduction: string; availabilityText: string; replyTimeText: string };
  leadForm: { enabled: boolean; heading: string; description: string; submitLabel: string; fields: Record<"name" | "email" | "phone", { visible: boolean; required: boolean }> };
};
type Message = { id: string; direction: "incoming" | "outgoing"; content: string; createdAt: number };
type Screen = "closed" | "home" | "form" | "chat";

function endpoint(init: WidgetInit, path: string, params?: Record<string, string>) {
  const url = new URL(path, init.apiBase);
  Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function json<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error("Widget request failed");
  return await response.json() as T;
}

function Widget() {
  const [init, setInit] = useState<WidgetInit | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [screen, setScreen] = useState<Screen>("closed");
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const parentOrigin = new URL(document.referrer).origin;
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== parentOrigin) return;
      if (isWidgetInit(event.data)) {
        setInit(event.data);
        return;
      }
      if (event.data?.source === "kilobot-host" && event.data?.version === 1 && event.data?.type === "command" && event.data.command === "open") setScreen("home");
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ source: "kilobot-frame", version: 1, type: "ready" }, parentOrigin);
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    if (!init) return;
    void json<Config>(endpoint(init, "/widget/config", { key: init.publicKey })).then(setConfig).catch(() => setError("We couldn’t load this chat."));
    void json<{ messages: Message[] }>(endpoint(init, "/widget/messages", { key: init.publicKey, visitorId: init.visitorId })).then(({ messages: next }) => setMessages(next)).catch(() => undefined);
    void json<{ profile: { name: string | null; email: string | null; phone: string | null } | null }>(endpoint(init, "/widget/visitor", { key: init.publicKey, visitorId: init.visitorId })).then(({ profile: next }) => {
      if (next) setProfile({ name: next.name ?? "", email: next.email ?? "", phone: next.phone ?? "" });
    }).catch(() => undefined);
  }, [init]);

  const open = () => setScreen("home");
  const start = () => setScreen(config?.leadForm.enabled && !profile.name && !profile.email && !profile.phone ? "form" : "chat");
  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!init) return;
    try {
      await json(endpoint(init, "/widget/visitor"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicKey: init.publicKey, visitorId: init.visitorId, ...profile }) });
      setScreen("chat");
    } catch {
      setError("Please review your details and try again.");
    }
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!init || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    setMessages((current) => [...current, { id: `pending-${Date.now()}`, direction: "incoming", content, createdAt: Date.now() }]);
    try {
      const result = await json<{ messages: Message[] }>(endpoint(init, "/widget/message"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicKey: init.publicKey, visitorId: init.visitorId, content, pageUrl: init.pageUrl }) });
      setMessages(result.messages);
    } catch {
      setError("Your message could not be sent. Please try again.");
    }
  };

  if (!config) return <button className="launcher" onClick={open} aria-label="Open chat">●</button>;
  if (screen === "closed") return <button className="launcher" onClick={open} aria-label="Open chat">●</button>;
  return <main className={`widget ${config.theme}`}>
    {screen === "home" && <section className="home"><button className="close" onClick={() => setScreen("closed")}>×</button><div className="orb">●</div><h1>{config.home.greeting}</h1><p>{config.home.introduction}</p><button className="status" onClick={start}><strong>{config.home.availabilityText}</strong><span>{config.home.replyTimeText}</span><b>{messages.length ? "Continue conversation" : "Start conversation"} ›</b></button></section>}
    {screen === "form" && <section className="panel"><button className="back" onClick={() => setScreen("home")}>‹ Back</button><h1>{config.leadForm.heading}</h1><p>{config.leadForm.description}</p><form onSubmit={submitProfile}>{(["name", "email", "phone"] as const).filter((field) => config.leadForm.fields[field].visible).map((field) => <label key={field}>{field}<input value={profile[field]} required={config.leadForm.fields[field].required} type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} /></label>)}<button>{config.leadForm.submitLabel}</button></form></section>}
    {screen === "chat" && <section className="chat"><header><button className="back" onClick={() => setScreen("home")}>‹</button><div><strong>{config.agentDisplayName}</strong><span>{config.home.replyTimeText}</span></div><button className="close" onClick={() => setScreen("closed")}>×</button></header><div className="messages">{messages.map((message) => <p key={message.id} className={message.direction}>{message.content}</p>)}</div><form className="composer" onSubmit={send}><textarea value={draft} placeholder={config.placeholder} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button>↑</button></form></section>}
    {error && <p className="error">{error}</p>}
  </main>;
}

createRoot(document.getElementById("root")!).render(<Widget />);
