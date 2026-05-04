import { useEffect, useState, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Bot,
  Check,
  ChevronDown,
  Send,
  Globe,
  FileText,
  AlignLeft,
  HelpCircle,
  Upload,
  X,
  Cpu,
  BookOpen,
  RotateCw,
  Wrench,
  Gamepad2,
  Maximize2,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useUIMessages, useSmoothText, optimisticallySendMessage } from "@convex-dev/agent/react";
import Markdown from "react-markdown";
import { AGENT_TEMPLATES, GOOGLE_MODELS, type AgentTemplateKey } from '@/lib/agentTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function StreamingMarkdown({ text, status }: { text: string; status: string }) {
  const [visibleText] = useSmoothText(text, { startStreaming: status === "streaming" });
  // Ensure every line break becomes a paragraph break
  const processed = visibleText.replace(/\n+/g, "\n\n");
  return (
    <div className="[&_p]:mb-3 [&_p]:leading-relaxed [&_p:first-child]:mt-0">
      <Markdown>{processed}</Markdown>
    </div>
  );
}

function AnimatedBotIcon({ isAnimating }: { isAnimating: boolean }) {
  return (
    <div className="relative flex size-9 shrink-0 items-center justify-center">
      {isAnimating && (
        <>
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              background: "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)",
            }}
          />
          <div className="absolute inset-[2px] rounded-full bg-card" />
        </>
      )}
      <Bot className="relative z-10 size-5 text-primary" />
    </div>
  );
}

// ─── Test Chat Window ─────────────────────────────────────

function TestChatWindow({
  agentId,
  threadId,
  navigate,
  lastTrainedAt,
}: {
  agentId: Id<"agents">;
  threadId: string | undefined;
  navigate: ReturnType<typeof useNavigate>;
  lastTrainedAt: number;
}) {
  const [conversationId, setConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const [reserveSpace, setReserveSpace] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesEndDialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputDialogRef = useRef<HTMLInputElement>(null);
  const threadInitRef = useRef(false);

  const resetThreadMutation = useMutation(api.chat.streaming.resetThread);
  const sendMessageMutation = useMutation(api.chat.streaming.sendMessage).withOptimisticUpdate((store, args) => {
    optimisticallySendMessage(api.chat.streaming.listThreadMessages)(store, {
      threadId: args.threadId,
      prompt: args.prompt,
    });
  });

  const conversation = useQuery(
    api.chat.streaming.getConversationByThreadId,
    threadId ? { threadId } : "skip",
  );

  const { results: messages, status } = useUIMessages(
    api.chat.streaming.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 10, stream: true },
  );

  useEffect(() => {
    if (conversation) {
      setConversationId(conversation._id);
    }
  }, [conversation]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isStreamingOrPending =
      lastMessage &&
      lastMessage.role !== "user" &&
      (lastMessage.status === "streaming" || lastMessage.status === "pending");

    setReserveSpace(isStreamingOrPending);
  }, [messages]);

  useEffect(() => {
    if (threadInitRef.current) return;
    if (threadId) {
      threadInitRef.current = true;
      return;
    }
    threadInitRef.current = true;
    resetThreadMutation({ agentId }).then(({ threadId, conversationId }) => {
      setConversationId(conversationId);
      navigate(`/dashboard/${agentId}/agent/${threadId}`, { replace: true });
    });
  }, [agentId, threadId, resetThreadMutation, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  useEffect(() => {
    if (expandOpen) {
      messagesEndDialogRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, expandOpen]);

  useEffect(() => {
    if (status !== "LoadingMore") return;
    const interval = setInterval(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      messagesEndDialogRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, 100);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (!isSending) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    messagesEndDialogRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [isSending]);

  const handleSend = async () => {
    if (!input.trim() || !threadId || isSending) return;
    const prompt = input.trim();
    setInput("");
    setIsSending(true);
    try {
      await sendMessageMutation({ threadId, agentId, prompt });
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
      inputDialogRef.current?.focus();
    }
  };

  const handleReset = () => {
    if (!threadId) return;
    setResetDialogOpen(true);
  };

  const handleResetConfirm = async () => {
    if (!threadId) return;
    setResetDialogOpen(false);
    const { threadId: newThreadId, conversationId: newConversationId } =
      await resetThreadMutation({ agentId, existingThreadId: threadId });
    setConversationId(newConversationId);
    navigate(`/dashboard/${agentId}/agent/${newThreadId}`, { replace: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chatMessages = (endRef?: React.RefObject<HTMLDivElement | null>) => (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">
            Send a message to test your agent.
          </p>
        </div>
      )}
      {messages.map((message) => (
        <div
          key={message.key}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          {message.role !== "user" ? (
            <div className="flex items-start gap-2">
              <AnimatedBotIcon isAnimating={message.status === "streaming" || message.status === "pending"} />
              <div className="text-base text-foreground leading-relaxed pt-1 prose prose-sm dark:prose-invert max-w-none">
                <StreamingMarkdown text={message.text} status={message.status} />
              </div>
            </div>
          ) : (
            <div className="max-w-[80%] rounded-lg bg-primary px-3 py-2 text-base text-primary-foreground">
              {message.text}
            </div>
          )}
        </div>
      ))}
      {status === "LoadingMore" && messages.length > 0 && (
        <div className="flex justify-start">
          <div className="flex items-start gap-2">
            <AnimatedBotIcon isAnimating={true} />
            <div className="pt-1">
              <Spinner className="size-4" />
            </div>
          </div>
        </div>
      )}
      {reserveSpace && (
        <div className="h-[30vh] shrink-0" />
      )}
      <div ref={endRef} className="h-0 shrink-0" />
    </div>
  );

  const chatInput = (ref: React.RefObject<HTMLInputElement | null>) => (
    <div className="border-t border-border p-4">
      <div className="relative flex items-center">
        <Input
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isSending}
          className="pr-10"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          className="absolute right-1 top-1/2 -translate-y-1/2"
        >
          {isSending ? (
            <Spinner className="size-4" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div>
        <div className="flex h-[694px] flex-col rounded-lg border border-border bg-card shadow-sm mt-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Test your agent</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setExpandOpen(true)}
                disabled={!threadId}
                title="Expand"
              >
                <Maximize2 className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleReset}
                disabled={!threadId}
                title="Reset conversation"
              >
                <RotateCw className="size-4" />
              </Button>
            </div>
          </div>

          {chatMessages(messagesEndRef)}
          {chatInput(inputRef)}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Last trained:</span>{" "}
          {new Date(lastTrainedAt).toLocaleString()}{" "}
          <span className="text-green-600 font-medium">Success</span>
        </p>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset conversation</DialogTitle>
            <DialogDescription>
              This will delete all messages and start a fresh thread.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleResetConfirm()}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expandOpen} onOpenChange={setExpandOpen}>
        <DialogContent
          className="min-w-[85vw] h-[90vh] flex flex-col p-0 gap-0"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <DialogTitle className="text-sm font-semibold">
              Test your agent
            </DialogTitle>
          </div>
          {chatMessages(messagesEndDialogRef)}
          {chatInput(inputDialogRef)}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Collapsible Components ─────────────────────────────────────

function ModelCollapsible({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="rounded-lg border border-border bg-card"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors [&[data-state=open]>svg]:rotate-180">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-foreground" />
          <span className="text-sm font-semibold text-foreground">Model</span>
        </div>
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border px-5 py-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function KnowledgeCollapsible({
  title,
  icon: Icon,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="rounded-lg border border-border bg-card"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors [&[data-state=open]>svg:last-child]:rotate-180">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-foreground" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Check className="size-3" />
              {count} {count === 1 ? 'item' : 'items'}
            </span>
          )}
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border px-5 py-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function AgentPage() {
  const navigate = useNavigate();
  const { agentId, threadId } = useParams();
  const selectedAgentId = agentId as Id<'agents'> | undefined;
  const agent = useQuery(
    api.agents.get,
    selectedAgentId ? { agentId: selectedAgentId } : 'skip',
  );
  const [name, setName] = useState('');
  const [templateKey, setTemplateKey] = useState<AgentTemplateKey>('blank');
  const [model, setModel] = useState(GOOGLE_MODELS[0].value);
  const [systemPrompt, setSystemPrompt] = useState('');

  // Knowledge sources state
  const [webUrls, setWebUrls] = useState('');
  const [textContent, setTextContent] = useState('');
  const [qaPairs, setQaPairs] = useState<
    { question: string; answer: string }[]
  >([{ question: '', answer: '' }]);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; size: number }[]
  >([]);

  const KB_LIMIT = 1024; // 1 MB limit for vector DB

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agent) return;
    setName(agent.name);
    setTemplateKey(agent.templateKey);
    setModel(agent.model);
    setSystemPrompt(agent.systemPrompt);
  }, [agent]);

  // Count knowledge items
  const webCount = webUrls
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.length > 0).length;
  const fileCount = uploadedFiles.length;
  const textCount = textContent.trim().length > 0 ? 1 : 0;
  const qaCount = qaPairs.filter(
    (p) => p.question.trim() || p.answer.trim(),
  ).length;

  // Estimate file size (KB)
  const fileSize = uploadedFiles.reduce((sum, f) => sum + f.size / 1024, 0);

  if (agent === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (agent === null || !selectedAgentId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Bot className="mb-3 size-8 text-muted-foreground" />
        <h1 className="m-0 text-lg font-semibold">Agent not found</h1>
        <Button asChild className="mt-5">
          <Link to="/workspace">Back to agents</Link>
        </Button>
      </div>
    );
  }

  const applyTemplate = (key: AgentTemplateKey) => {
    setTemplateKey(key);
    setSystemPrompt(AGENT_TEMPLATES[key].prompt);
    setStatus(null);
  };

  const addQAPair = () => {
    setQaPairs((prev) => [...prev, { question: '', answer: '' }]);
  };

  const updateQAPair = (
    index: number,
    field: 'question' | 'answer',
    value: string,
  ) => {
    setQaPairs((prev) =>
      prev.map((pair, i) =>
        i === index ? { ...pair, [field]: value } : pair,
      ),
    );
  };

  const removeQAPair = (index: number) => {
    setQaPairs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight">AI Agent</h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Configure the selected dashboard agent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Check className="size-4" />
              {status}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[3fr_7fr]">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* ── Setup Section ── */}
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Basic Configuration
            </h2>
          </div>

          <ModelCollapsible>
            <div className="grid gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Name
                </span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Model
                </span>
                <select
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
                >
                  {GOOGLE_MODELS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Goal
                </span>
                <textarea
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  rows={8}
                  className="min-h-40 resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
                />
              </label>

              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Templates
                </span>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(Object.keys(AGENT_TEMPLATES) as AgentTemplateKey[]).map(
                    (key) => {
                      const template = AGENT_TEMPLATES[key];
                      const isActive = templateKey === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyTemplate(key)}
                          className={`rounded-lg border px-3 py-3 text-left transition-colors ${isActive
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-background hover:bg-muted'
                            }`}
                        >
                          <span className="block text-xs font-semibold">
                            {template.label}
                          </span>
                          <span
                            className={`mt-1 block text-xs leading-4 ${isActive
                              ? 'text-background/70'
                              : 'text-muted-foreground'
                              }`}
                          >
                            {template.description}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          </ModelCollapsible>

          {/* ── Knowledge Base Section ── */}
          <div className="flex items-center gap-2 pt-1">
            <BookOpen className="size-4 text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Knowledge Base
            </h2>
          </div>

          <KnowledgeCollapsible title="Web" icon={Globe} count={webCount}>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Add URLs the agent should know about. One per line.
              </p>
              <textarea
                value={webUrls}
                onChange={(e) => setWebUrls(e.target.value)}
                rows={4}
                placeholder="https://example.com&#10;https://docs.example.com"
                className="min-h-24 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
              />
            </div>
          </KnowledgeCollapsible>

          <KnowledgeCollapsible
            title="Files"
            icon={Upload}
            count={fileCount}
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Upload files for the agent to reference.
              </p>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
                  <Upload className="size-4" />
                  Choose files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.name)}
                        className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </KnowledgeCollapsible>

          <KnowledgeCollapsible
            title="Text"
            icon={AlignLeft}
            count={textCount}
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Add plain text knowledge for the agent.
              </p>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                placeholder="Enter text knowledge here..."
                className="min-h-32 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
              />
            </div>
          </KnowledgeCollapsible>

          <KnowledgeCollapsible title="Q&A" icon={HelpCircle} count={qaCount}>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Add question and answer pairs for the agent to learn from.
              </p>
              <div className="space-y-3">
                {qaPairs.map((pair, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-border bg-background p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Q&A Pair {index + 1}
                      </span>
                      {qaPairs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQAPair(index)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Question"
                      value={pair.question}
                      onChange={(e) =>
                        updateQAPair(index, 'question', e.target.value)
                      }
                      className="text-sm"
                    />
                    <textarea
                      placeholder="Answer"
                      value={pair.answer}
                      onChange={(e) =>
                        updateQAPair(index, 'answer', e.target.value)
                      }
                      rows={2}
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm leading-5 outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQAPair}
                  className="w-full"
                >
                  Add Q&A Pair
                </Button>
              </div>
            </div>
          </KnowledgeCollapsible>

          {/* ── File size limit Section ── */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                File size limit
              </h2>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Storage used</span>
                <span>
                  {fileSize.toFixed(1)} KB of {KB_LIMIT} KB
                </span>
              </div>
              <Progress value={Math.min((fileSize / KB_LIMIT) * 100, 100)} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Test Chat */}
        <aside className="xl:sticky xl:top-6 space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Gamepad2 className="size-4" />
            Playground
          </h2>
          <TestChatWindow agentId={agent._id} threadId={threadId} navigate={navigate} lastTrainedAt={agent.updatedAt} />
        </aside>
      </div>
    </div>
  );
}
