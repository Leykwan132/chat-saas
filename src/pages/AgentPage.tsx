import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { Link, useParams } from 'react-router';

import {
  ChevronDown,
  Wrench,
  Gamepad2,
  Bot,
  Save,
  RefreshCw,
  Check,
  Zap,
  Info,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AGENT_TEMPLATES, GOOGLE_MODELS, type AgentTemplateKey } from '@/lib/agentTemplates';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";

import { TestChatWindow } from "@/components/TestChatWindow";

// ─── Main Page ──────────────────────────────────────────────────

export default function AgentPage() {
  const { agentId, threadId } = useParams();
  const selectedAgentId = agentId as Id<'agents'> | undefined;
  const agent = useQuery(
    api.agents.get,
    selectedAgentId ? { agentId: selectedAgentId } : 'skip',
  );
  const [name, setName] = useState('');
  const [templateKey, setTemplateKey] = useState<AgentTemplateKey>('blank');
  const [model, setModel] = useState(GOOGLE_MODELS[0].value);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateAgent = useMutation(api.agents.update);
  const getIndexingStatus = useAction(api.cloudflare.getIndexingStatus);
  const [indexingStatus, setIndexingStatus] = useState<{ isIndexing: boolean; queued: number; running: number } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      const result = await getIndexingStatus();
      setIndexingStatus({ isIndexing: result.isIndexing, queued: result.queued ?? 0, running: result.running ?? 0 });
    } catch {
      toast.error("Failed to check agent status");
    } finally {
      setIsCheckingStatus(false);
    }
  }, [getIndexingStatus]);

  useEffect(() => {
    if (!agent) return;
    setName(agent.name);
    setTemplateKey(agent.templateKey);
    setModel(agent.model);
    setSystemPrompt(agent.systemPrompt);
  }, [agent]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => {
      checkStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleSave = async () => {
    if (!selectedAgentId || !agent) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateAgent({
        agentId: selectedAgentId,
        name,
        model,
        systemPrompt,
        templateKey,
      });
      toast.success("Agent saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save agent");
      toast.error("Failed to save agent");
    } finally {
      setIsSaving(false);
    }
  };

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

  const hasChanges =
    name !== agent.name ||
    model !== agent.model ||
    templateKey !== agent.templateKey ||
    systemPrompt !== agent.systemPrompt;

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight">Playground</h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            Test and configure your agent.
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
          {/* ── Agent Status ── */}
          <div className="space-y-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0">
                  <Zap className="size-4 text-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Agent Status
                  </h2>
                  <Info className="size-3.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <PopoverHeader>
                  <PopoverTitle>Agent Status</PopoverTitle>
                  <PopoverDescription>
                    Every time a new resource is added, the model is retrained automatically.
                  </PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 mt-4">
              <div className="flex items-center gap-2">
                {isCheckingStatus ? (
                  <>
                    <div className="flex size-4 items-center justify-center rounded-full bg-muted">
                      <Spinner className="size-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Fetching Updates…</span>
                  </>
                ) : indexingStatus?.isIndexing ? (
                  <>
                    <Spinner className="size-4 text-yellow-500" />
                    <span className="text-sm font-medium text-foreground">Training</span>
                    <span className="text-xs text-muted-foreground">
                      {indexingStatus.queued} queued · {indexingStatus.running} running
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex size-4 items-center justify-center rounded-full bg-emerald-700">
                      <Check className="size-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Agent is up to date</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void checkStatus()}
                disabled={isCheckingStatus}
                title="Refresh status"
              >
                <RefreshCw className={`size-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* ── Basic Configuration ── */}
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wrench className="size-4" />
              Basic Configuration
            </h2>
            <div className="rounded-lg border border-border bg-card mt-4">
              <div className="px-5 py-4">
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
                    <ModelSelector
                      open={modelSelectorOpen}
                      onOpenChange={setModelSelectorOpen}
                    >
                      <ModelSelectorTrigger className="w-full">
                        <ModelSelectorLogo provider="google" />
                        <ModelSelectorName>
                          {GOOGLE_MODELS.find((m) => m.value === model)?.label ??
                            model}
                        </ModelSelectorName>
                        <ChevronDown className="ml-auto size-4 text-muted-foreground shrink-0" />
                      </ModelSelectorTrigger>
                      <ModelSelectorContent>
                        <ModelSelectorInput placeholder="Search models..." />
                        <ModelSelectorList>
                          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                          <ModelSelectorGroup heading="Google">
                            {GOOGLE_MODELS.map((option) => (
                              <ModelSelectorItem
                                key={option.value}
                                value={option.value}
                                onSelect={(value) => {
                                  setModel(value);
                                  setModelSelectorOpen(false);
                                }}
                              >
                                <ModelSelectorLogo provider="google" />
                                <ModelSelectorName>
                                  {option.label}
                                </ModelSelectorName>
                                {model === option.value && (
                                  <Check className="ml-auto size-4" />
                                )}
                              </ModelSelectorItem>
                            ))}
                          </ModelSelectorGroup>
                        </ModelSelectorList>
                      </ModelSelectorContent>
                    </ModelSelector>
                  </label>

                  <div>
                    <span className="text-xs font-medium text-muted-foreground">
                      Role Template
                    </span>
                    <div className="mt-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            <span>{AGENT_TEMPLATES[templateKey].label}</span>
                            <ChevronDown className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                          <DropdownMenuGroup>
                            {(Object.keys(AGENT_TEMPLATES) as AgentTemplateKey[]).map((key) => {
                              const template = AGENT_TEMPLATES[key];
                              return (
                                <DropdownMenuItem
                                  key={key}
                                  onClick={() => applyTemplate(key)}
                                  className="flex flex-col items-start gap-1"
                                >
                                  <span className="text-sm font-medium">{template.label}</span>
                                  <span className="text-xs text-muted-foreground">{template.description}</span>
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Goal
                    </span>
                    <textarea
                      value={systemPrompt}
                      onChange={(event) => setSystemPrompt(event.target.value)}
                      className="min-h-53 resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30 overflow-y-auto"
                    />
                  </label>

                  {hasChanges && (
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        disabled={isSaving || !name.trim() || !systemPrompt.trim()}
                        onClick={() => void handleSave()}
                      >
                        {isSaving ? (
                          <Spinner className="size-4" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Playground */}
        <aside className="xl:sticky xl:top-6 space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Gamepad2 className="size-4" />
            Playground
          </h2>
          <TestChatWindow agentId={agent._id} threadId={threadId} />
          {indexingStatus && (
            <p className="text-xs text-muted-foreground text-center">
              {indexingStatus.isIndexing ? "The agent is updating…" : "Agent is up to date"}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
