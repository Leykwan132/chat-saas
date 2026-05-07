import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { Link, useNavigate, useParams } from 'react-router';
import { Shimmer } from "@/components/ai-elements/shimmer";

import {
  ChevronDown,
  Globe,
  FileText,
  AlignLeft,
  HelpCircle,
  Plus,
  Upload,
  Trash2,
  Cpu,
  BookOpen,
  Wrench,
  Gamepad2,
  Bot,
  Save,
  X,
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
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileUploader } from "react-drag-drop-files";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";

import { TestChatWindow } from "@/components/TestChatWindow";

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
      <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors [&[data-state=open]_svg:last-child]:rotate-180">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-foreground" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 dark:bg-amber-500/25 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30">
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

function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }
  return `${kb.toFixed(1)} KB`;
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
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');

  // Knowledge sources state — fetched from Convex
  const textEntries = useQuery(api.knowledgeBase.listTextEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const fileEntries = useQuery(api.knowledgeBase.listFileEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const webEntries = useQuery(api.knowledgeBase.listWebEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");
  const qaEntries = useQuery(api.knowledgeBase.listQAEntries, selectedAgentId ? { agentId: selectedAgentId } : "skip");

  // Mutations
  const addTextEntry = useAction(api.cloudflare.uploadTextEntry);
  const updateTextEntry = useAction(api.cloudflare.updateTextEntry);
  const addFileEntry = useAction(api.cloudflare.uploadFileEntry);
  const scrapePreviewLinks = useAction(api.cloudflare.scrapePreviewLinks);
  const processWebUrlAction = useAction(api.cloudflare.processWebUrl);
  const addQAEntry = useAction(api.cloudflare.uploadQAEntry);
  const updateQAEntry = useAction(api.cloudflare.updateQAEntry);
  const removeTextEntry = useAction(api.cloudflare.deleteTextEntry);
  const removeFileEntry = useAction(api.cloudflare.deleteFileEntry);
  const removeWebEntry = useAction(api.cloudflare.deleteWebEntry);
  const removeQAEntry = useAction(api.cloudflare.deleteQAEntry);

  // Sheet states for knowledge base
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [fileSheetOpen, setFileSheetOpen] = useState(false);
  const [selectedUploadFiles, setSelectedUploadFiles] = useState<File[]>([]);
  const [webDialogOpen, setWebDialogOpen] = useState(false);
  const [webInput, setWebInput] = useState("");
  const [discoveredLinks, setDiscoveredLinks] = useState<string[]>([]);
  const [selectedLinkIndices, setSelectedLinkIndices] = useState<Set<number>>(new Set());
  const [isSearchingLinks, setIsSearchingLinks] = useState(false);
  const [searchSourceUrl, setSearchSourceUrl] = useState("");
  const [linkSizes, setLinkSizes] = useState<Record<number, number>>({});
  const [qaSheetOpen, setQASheetOpen] = useState(false);
  const [qaTitle, setQATitle] = useState("");
  const [qaPairs, setQAPairs] = useState<{ question: string; answer: string }[]>([
    { question: "", answer: "" },
  ]);

  const [isSavingText, setIsSavingText] = useState(false);
  const [isSavingWeb, setIsSavingWeb] = useState(false);
  const [isSavingQA, setIsSavingQA] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);

  // Editing states for knowledge base entries
  const [editingTextEntry, setEditingTextEntry] = useState<NonNullable<typeof textEntries>[number] | null>(null);
  const [editingFileEntry, setEditingFileEntry] = useState<NonNullable<typeof fileEntries>[number] | null>(null);
  const [editingWebEntry, setEditingWebEntry] = useState<NonNullable<typeof webEntries>[number] | null>(null);
  const [editingQAEntry, setEditingQAEntry] = useState<NonNullable<typeof qaEntries>[number] | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'web' | 'file' | 'text' | 'qa'; entryId: Id<any> } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateAgent = useMutation(api.agents.update);
  const storageLimits = useQuery(api.knowledgeBase.getStorageLimit);
  const maxFileSize = storageLimits?.maxFileSize ?? 4 * 1024 * 1024;
  const maxTotalSize = storageLimits?.maxTotalSize ?? 4 * 1024 * 1024;
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

  // Count knowledge items from Convex data
  const textCount = textEntries?.length ?? 0;
  const fileCount = fileEntries?.length ?? 0;
  const webCount = webEntries?.length ?? 0;
  const qaCount = qaEntries?.length ?? 0;

  // Estimate total file size (bytes)
  const totalFileSize =
    (textEntries ?? []).reduce((sum, e) => sum + (e.fileSize ?? 0), 0) +
    (fileEntries ?? []).reduce((sum, e) => sum + (e.fileSize ?? 0), 0) +
    (webEntries ?? []).reduce((sum, e) => sum + (e.fileSize ?? 0), 0) +
    (qaEntries ?? []).reduce((sum, e) => sum + (e.fileSize ?? 0), 0);

  // Save handlers
  const handleSaveText = async () => {
    if (!selectedAgentId || !textTitle.trim() || !textContent.trim()) return;
    setIsSavingText(true);
    try {
      if (editingTextEntry) {
        await updateTextEntry({ entryId: editingTextEntry._id, title: textTitle.trim(), content: textContent.trim(), cfItemId: editingTextEntry.cfItemId ?? undefined });
        toast.success("Text entry updated");
        setEditingTextEntry(null);
      } else {
        await addTextEntry({ agentId: selectedAgentId, title: textTitle.trim(), content: textContent.trim() });
        toast.success("Text entry saved");
      }
      setTextTitle("");
      setTextContent("");
      setTextSheetOpen(false);
    } catch {
      toast.error(editingTextEntry ? "Failed to update text entry" : "Failed to save text entry");
    } finally {
      setIsSavingText(false);
    }
  };

  const handleSaveFile = async (files: File[]) => {
    if (!selectedAgentId || files.length === 0) return;
    setIsSavingFile(true);
    try {
      for (const file of files) {
        const fileBytes = await file.arrayBuffer();
        await addFileEntry({ agentId: selectedAgentId, fileName: file.name, fileBytes });
      }
      toast.success("Files saved");
      setFileSheetOpen(false);
      setSelectedUploadFiles([]);
    } catch {
      toast.error("Failed to save files");
    } finally {
      setIsSavingFile(false);
    }
  };

  const handleSearchWeb = async () => {
    if (!webInput.trim()) return;
    setIsSearchingLinks(true);
    try {
      const result = await scrapePreviewLinks({ url: webInput.trim() });
      setDiscoveredLinks(result.links);
      setSelectedLinkIndices(new Set(result.links.map((_, i) => i)));
      setSearchSourceUrl(result.sourceUrl);
      setLinkSizes({});
    } catch {
      toast.error("Failed to discover links from this URL");
      setDiscoveredLinks([]);
      setSelectedLinkIndices(new Set());
    } finally {
      setIsSearchingLinks(false);
    }
  };

  const toggleLinkSelection = (index: number) => {
    setSelectedLinkIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const removeDiscoveredLink = (index: number) => {
    setDiscoveredLinks((prev) => prev.filter((_, i) => i !== index));
    setSelectedLinkIndices((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  };

  const handleConfirmWeb = async () => {
    if (!selectedAgentId) return;
    const selectedUrls = discoveredLinks.filter((_, i) => selectedLinkIndices.has(i));
    if (selectedUrls.length === 0) return;
    setIsSavingWeb(true);
    try {
      for (const url of selectedUrls) {
        const idx = discoveredLinks.indexOf(url);
        const result = await processWebUrlAction({
          agentId: selectedAgentId,
          url,
          parentUrl: url === searchSourceUrl ? undefined : searchSourceUrl,
        });
        if (idx !== -1 && result.fileSize) {
          setLinkSizes((prev) => ({ ...prev, [idx]: result.fileSize! }));
        }
      }
      toast.success(`${selectedUrls.length} URL${selectedUrls.length > 1 ? "s" : ""} saved`);
      setWebInput("");
      setDiscoveredLinks([]);
      setSelectedLinkIndices(new Set());
      setSearchSourceUrl("");
      setLinkSizes({});
      setWebDialogOpen(false);
    } catch {
      toast.error("Failed to save some URLs");
    } finally {
      setIsSavingWeb(false);
    }
  };

  const handleSaveQA = async () => {
    if (!selectedAgentId) return;
    const validPairs = qaPairs.filter((p) => p.question.trim() && p.answer.trim());
    if (validPairs.length === 0) return;
    setIsSavingQA(true);
    try {
      if (editingQAEntry) {
        const pair = validPairs[0];
        await updateQAEntry({ entryId: editingQAEntry._id, question: pair.question.trim(), answer: pair.answer.trim(), cfItemId: editingQAEntry.cfItemId ?? undefined });
        toast.success("Q&A pair updated");
        setEditingQAEntry(null);
      } else {
        for (const pair of validPairs) {
          await addQAEntry({
            agentId: selectedAgentId,
            question: pair.question.trim(),
            answer: pair.answer.trim(),
          });
        }
        toast.success(`${validPairs.length} Q&A pair${validPairs.length > 1 ? "s" : ""} saved`);
      }
      setQATitle("");
      setQAPairs([{ question: "", answer: "" }]);
      setQASheetOpen(false);
    } catch {
      toast.error(editingQAEntry ? "Failed to update Q&A entry" : "Failed to save Q&A entry");
    } finally {
      setIsSavingQA(false);
    }
  };

  const addQAPair = () => {
    setQAPairs((prev) => [...prev, { question: "", answer: "" }]);
  };

  const updateQAPair = (index: number, field: "question" | "answer", value: string) => {
    setQAPairs((prev) =>
      prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair))
    );
  };

  const removeQAPair = (index: number) => {
    setQAPairs((prev) => prev.filter((_, i) => i !== index));
  };

  const openEditText = (entry: NonNullable<typeof textEntries>[number]) => {
    setEditingTextEntry(entry);
    setTextTitle(entry.title);
    setTextContent(entry.content);
    setTextSheetOpen(true);
  };

  const openEditFile = (entry: NonNullable<typeof fileEntries>[number]) => {
    setEditingFileEntry(entry);
    setFileSheetOpen(true);
  };

  const openEditWeb = (entry: NonNullable<typeof webEntries>[number]) => {
    setEditingWebEntry(entry);
    setWebInput(entry.url);
    setWebDialogOpen(true);
  };

  const openEditQA = (entry: NonNullable<typeof qaEntries>[number]) => {
    setEditingQAEntry(entry);
    setQATitle("");
    setQAPairs([{ question: entry.question, answer: entry.answer }]);
    setQASheetOpen(true);
  };

  const handleSheetClose = (type: 'text' | 'file' | 'web' | 'qa', open: boolean) => {
    if (!open) {
      if (type === 'text') { setEditingTextEntry(null); setTextTitle(""); setTextContent(""); }
      if (type === 'file') { setEditingFileEntry(null); setSelectedUploadFiles([]); }
      if (type === 'web') { setEditingWebEntry(null); setWebInput(""); setDiscoveredLinks([]); setSelectedLinkIndices(new Set()); setSearchSourceUrl(""); setLinkSizes({}); setWebDialogOpen(false); }
      if (type === 'qa') { setEditingQAEntry(null); setQATitle(""); setQAPairs([{ question: "", answer: "" }]); }
    }
  };

  const openDeleteDialog = (type: 'web' | 'file' | 'text' | 'qa', entryId: Id<any>) => {
    setDeleteTarget({ type, entryId });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      switch (deleteTarget.type) {
        case 'text':
          await removeTextEntry({ entryId: deleteTarget.entryId });
          break;
        case 'file':
          await removeFileEntry({ entryId: deleteTarget.entryId });
          break;
        case 'web':
          await removeWebEntry({ entryId: deleteTarget.entryId });
          break;
        case 'qa':
          await removeQAEntry({ entryId: deleteTarget.entryId });
          break;
      }
      toast.success("Entry deleted successfully");
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

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

  return (
    <>
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
                    rows={8}
                    className="min-h-40 resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
                  />
                </label>
              </div>
            </ModelCollapsible>

            {/* ── Agent Status ── */}
            <div className="space-y-2 pt-6">
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
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
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

            {/* ── Knowledge Base Section ── */}
            <div className="flex items-center gap-2 pt-6">
              <BookOpen className="size-4 text-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                Knowledge Base
              </h2>
            </div>

            <KnowledgeCollapsible title="Web" icon={Globe} count={webCount}>
              <Dialog open={webDialogOpen} onOpenChange={(open) => { if (!open) handleSheetClose('web', false); setWebDialogOpen(open); }}>
                {(!webEntries || webEntries.length === 0) ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Globe className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>No URLs yet</EmptyTitle>
                      <EmptyDescription>
                        Add web URLs for your agent to reference and learn from.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="size-3 mr-1" />
                          Add URL
                        </Button>
                      </DialogTrigger>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <>
                    <div className="space-y-2 mb-3">
                      {webEntries.map((entry) => (
                        <div
                          key={entry._id}
                          onClick={() => openEditWeb(entry)}
                          className="group flex items-center justify-between rounded-md bg-muted px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm truncate">{entry.url}</span>
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums min-w-[4.5rem] text-right">{formatFileSize(entry.fileSize)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog('web', entry._id); }}
                            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors shrink-0 ml-2 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="size-3 mr-1" />
                        Add URL
                      </Button>
                    </DialogTrigger>
                  </>
                )}
                <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>{editingWebEntry ? "Edit Web URL" : "Add Web URL"}</DialogTitle>
                    <DialogDescription>
                      {editingWebEntry
                        ? "View the entry details. URLs cannot be changed once added."
                        : "Enter a URL to discover links for your agent."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6">
                    {/* Left: input + links */}
                    <div className="space-y-4 min-w-0">
                      {editingWebEntry ? (
                        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 space-y-1.5">
                          <p className="text-sm break-all">{editingWebEntry.url}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{formatFileSize(editingWebEntry.fileSize)}</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <Input
                              value={webInput}
                              onChange={(e) => setWebInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleSearchWeb(); }}
                              placeholder="https://example.com"
                              className="flex-1"
                            />
                          </div>
                          {isSearchingLinks ? (
                            <div className="mt-3 ml-1">
                              <Shimmer duration={2} spread={3} as="span" className="text-sm">The agent is updating...</Shimmer>
                            </div>
                          ) : discoveredLinks.length > 0 && (
                            <div className="space-y-0.5 max-h-64 overflow-y-auto rounded-lg border border-border">
                              {discoveredLinks.map((link, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleLinkSelection(index)}
                                    className={`flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${selectedLinkIndices.has(index)
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground/30"
                                      }`}
                                  >
                                    {selectedLinkIndices.has(index) && <Check className="size-3" />}
                                  </button>
                                  <span className="flex-1 text-sm truncate">{link}</span>
                                  {linkSizes[index] !== undefined && (
                                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums min-w-[4.5rem] text-right">{formatFileSize(linkSizes[index])}</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeDiscoveredLink(index)}
                                    className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Right: step indicators */}
                    {!editingWebEntry && (
                      <div className="hidden md:block">
                        <div className="space-y-1.5">
                          {[
                            { label: "AI explore website", step: 1 },
                            { label: "AI deep research", step: 2 },
                            { label: "AI agent knowledge", step: 3 },
                          ].map((s) => {
                            const hasLinks = discoveredLinks.length > 0;
                            const isStep1 = s.step === 1;
                            const isStep2 = s.step === 2;

                            const step1Done = hasLinks && !isSearchingLinks;
                            const isDone = isStep1 && step1Done;
                            const isActive =
                              (isStep1 && (isSearchingLinks || !hasLinks)) ||
                              (isStep2 && (isSavingWeb || step1Done));

                            return (
                              <div
                                key={s.step}
                                className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                                  }`}
                              >
                                <div
                                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium mt-0.5 ${isActive
                                    ? "bg-primary text-primary-foreground"
                                    : isDone
                                      ? "bg-emerald-600 text-white"
                                      : "border border-muted-foreground/30"
                                    }`}
                                >
                                  {isDone ? <Check className="size-3" /> : s.step}
                                </div>
                                <span className="leading-5">{s.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="flex flex-row justify-end gap-2">
                    {editingWebEntry ? (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => { setWebDialogOpen(false); openDeleteDialog('web', editingWebEntry._id); }}
                        disabled={isSavingWeb}
                      >
                        <Trash2 className="size-4 mr-1" />
                        Delete
                      </Button>
                    ) : discoveredLinks.length > 0 ? (
                      <Button type="button" onClick={handleConfirmWeb} disabled={isSavingWeb || selectedLinkIndices.size === 0}>
                        {isSavingWeb ? <Spinner className="size-4" /> : "Confirm"}
                      </Button>
                    ) : (
                      <Button type="button" onClick={handleSearchWeb} disabled={!webInput.trim() || isSearchingLinks}>
                        {isSearchingLinks ? <Spinner className="size-4" /> : "Continue"}
                      </Button>
                    )}
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </KnowledgeCollapsible>

            <KnowledgeCollapsible title="Files" icon={Upload} count={fileCount}>
              <Sheet open={fileSheetOpen} onOpenChange={(open) => { if (!open) handleSheetClose('file', false); setFileSheetOpen(open); }}>
                {(!fileEntries || fileEntries.length === 0) ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Upload className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>No files yet</EmptyTitle>
                      <EmptyDescription>
                        Upload files for your agent to reference and learn from.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="size-3 mr-1" />
                          Add File
                        </Button>
                      </SheetTrigger>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <>
                    <div className="space-y-2 mb-3">
                      {fileEntries.map((entry) => (
                        <div
                          key={entry._id}
                          onClick={() => openEditFile(entry)}
                          className="group flex items-center justify-between rounded-md bg-muted px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="size-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{entry.title || entry.fileName}</span>
                            <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(entry.fileSize)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog('file', entry._id); }}
                            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors shrink-0 ml-2 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="size-3 mr-1" />
                        Add File
                      </Button>
                    </SheetTrigger>
                  </>
                )}
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>{editingFileEntry ? "File Details" : "Upload Files"}</SheetTitle>
                    <SheetDescription>
                      {editingFileEntry ? "View or delete this file entry." : "Upload files for the agent to reference."}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 px-6 py-4">
                    {editingFileEntry ? (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-medium text-muted-foreground">File name</label>
                          <span className="text-sm text-foreground">{editingFileEntry.fileName}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-medium text-muted-foreground">File size</label>
                          <span className="text-sm text-muted-foreground">{formatFileSize(editingFileEntry.fileSize)}</span>
                        </div>
                      </div>
                    ) : selectedUploadFiles.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-medium text-muted-foreground">Selected files</label>
                          <div className="space-y-2">
                            {selectedUploadFiles.map((file, i) => (
                              <div key={i} className="flex items-center rounded-lg border border-border bg-muted/50 p-3">
                                <FileText className="size-5 text-muted-foreground shrink-0 mr-3" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedUploadFiles(prev => prev.filter((_, idx) => idx !== i))}
                                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors shrink-0 ml-3"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <FileUploader
                        key={String(fileSheetOpen)}
                        handleChange={(files: File | File[]) => {
                          const normalized = files instanceof File ? [files] : Array.isArray(files) ? files : [];
                          const valid: File[] = [];
                          let tooBigCount = 0;
                          for (const f of normalized) {
                            if (f.size > maxFileSize) {
                              tooBigCount++;
                            } else {
                              valid.push(f);
                            }
                          }
                          if (tooBigCount > 0) {
                            toast.error(`${tooBigCount} file${tooBigCount > 1 ? 's' : ''} too big. Limit is ${formatFileSize(maxFileSize)} per file.`);
                          }
                          if (valid.length > 0) setSelectedUploadFiles(valid);
                        }}
                        uploadedLabel="Uploaded files"
                        name="files"
                        classes="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border aspect-square text-center transition-colors hover:bg-muted/50"
                      >
                        <Upload className="size-6 text-muted-foreground" />
                        <span className="text-sm font-medium">Drop files here or click to browse</span>
                      </FileUploader>
                    )}
                  </div>
                  <SheetFooter className="flex flex-row justify-end gap-2">
                    {editingFileEntry ? (
                      <>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => { setFileSheetOpen(false); openDeleteDialog('file', editingFileEntry._id); }}
                          disabled={isSavingFile}
                        >
                          <Trash2 className="size-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    ) : selectedUploadFiles.length > 0 ? (
                      <Button type="button" onClick={() => handleSaveFile(selectedUploadFiles)} disabled={isSavingFile}>
                        {isSavingFile ? <Spinner className="size-4" /> : "Save"}
                      </Button>
                    ) : null}
                    <SheetClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </KnowledgeCollapsible>

            <KnowledgeCollapsible title="Text" icon={AlignLeft} count={textCount}>
              <Sheet open={textSheetOpen} onOpenChange={(open) => { if (!open) handleSheetClose('text', false); setTextSheetOpen(open); }}>
                {(!textEntries || textEntries.length === 0) ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <AlignLeft className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>No text yet</EmptyTitle>
                      <EmptyDescription>
                        Add plain text knowledge for your agent to reference.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="size-3 mr-1" />
                          Add Text
                        </Button>
                      </SheetTrigger>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <>
                    <div className="space-y-2 mb-3">
                      {textEntries.map((entry) => (
                        <div
                          key={entry._id}
                          onClick={() => openEditText(entry)}
                          className="group flex items-center justify-between rounded-md bg-muted px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
                        >
                          <div className="min-w-0">
                            <span className="text-sm font-medium">{entry.title}</span>
                            <span className="text-xs text-muted-foreground ml-2">({formatFileSize(entry.fileSize)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog('text', entry._id); }}
                            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors shrink-0 ml-2 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="size-3 mr-1" />
                        Add Text
                      </Button>
                    </SheetTrigger>
                  </>
                )}
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>{editingTextEntry ? "Edit Text Knowledge" : "Add Text Knowledge"}</SheetTitle>
                    <SheetDescription>
                      {editingTextEntry ? "Update this text knowledge entry." : "Add plain text knowledge for the agent to reference."}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 px-6 py-4 space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Title</label>
                      <Input value={textTitle} onChange={(e) => setTextTitle(e.target.value)} placeholder="Knowledge title" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Content</label>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        rows={8}
                        placeholder="Enter text knowledge here..."
                        className="min-h-32 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
                      />
                    </div>
                  </div>
                  <SheetFooter className="flex flex-row justify-end gap-2">
                    {editingTextEntry && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => { setTextSheetOpen(false); openDeleteDialog('text', editingTextEntry._id); }}
                        disabled={isSavingText}
                      >
                        <Trash2 className="size-4 mr-1" />
                        Delete
                      </Button>
                    )}
                    <Button type="button" onClick={handleSaveText} disabled={!textTitle.trim() || !textContent.trim() || isSavingText}>
                      {isSavingText ? <Spinner className="size-4" /> : editingTextEntry ? "Update" : "Save"}
                    </Button>
                    <SheetClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </KnowledgeCollapsible>

            <KnowledgeCollapsible title="Q&A" icon={HelpCircle} count={qaCount}>
              <Sheet open={qaSheetOpen} onOpenChange={(open) => { if (!open) handleSheetClose('qa', false); setQASheetOpen(open); }}>
                {(!qaEntries || qaEntries.length === 0) ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <HelpCircle className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>No Q&A yet</EmptyTitle>
                      <EmptyDescription>
                        Add question and answer pairs for your agent to learn from.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="size-3 mr-1" />
                          Add Q&A
                        </Button>
                      </SheetTrigger>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <>
                    <div className="space-y-2 mb-3">
                      {qaEntries.map((entry) => (
                        <div
                          key={entry._id}
                          onClick={() => openEditQA(entry)}
                          className="group rounded-md bg-muted px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">Q: {entry.question}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openDeleteDialog('qa', entry._id); }}
                              className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors shrink-0 ml-2 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">A: {entry.answer}</p>
                        </div>
                      ))}
                    </div>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="size-3 mr-1" />
                        Add Q&A
                      </Button>
                    </SheetTrigger>
                  </>
                )}
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>{editingQAEntry ? "Edit Q&A Pair" : "Add Q&A Pair"}</SheetTitle>
                    <SheetDescription>
                      {editingQAEntry ? "Update this Q&A entry." : "Add question and answer pairs for the agent to learn from."}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
                    {!editingQAEntry && (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Title</label>
                        <Input value={qaTitle} onChange={(e) => setQATitle(e.target.value)} placeholder="Optional title" />
                      </div>
                    )}
                    {qaPairs.map((pair, index) => (
                      <div key={index} className="space-y-2 rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Pair {index + 1}</span>
                          {!editingQAEntry && qaPairs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQAPair(index)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Input
                            value={pair.question}
                            onChange={(e) => updateQAPair(index, "question", e.target.value)}
                            placeholder="Enter question"
                          />
                          <textarea
                            value={pair.answer}
                            onChange={(e) => updateQAPair(index, "answer", e.target.value)}
                            rows={3}
                            placeholder="Enter answer"
                            className="min-h-20 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm leading-5 outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
                          />
                        </div>
                      </div>
                    ))}
                    {!editingQAEntry && (
                      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addQAPair}>
                        <Plus className="size-3 mr-1" />
                        Add more
                      </Button>
                    )}
                  </div>
                  <SheetFooter className="flex flex-row justify-end gap-2">
                    {editingQAEntry && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => { setQASheetOpen(false); openDeleteDialog('qa', editingQAEntry._id); }}
                        disabled={isSavingQA}
                      >
                        <Trash2 className="size-4 mr-1" />
                        Delete
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleSaveQA}
                      disabled={isSavingQA || !qaPairs.some((p) => p.question.trim() && p.answer.trim())}
                    >
                      {isSavingQA ? <Spinner className="size-4" /> : editingQAEntry ? "Update" : "Save"}
                    </Button>
                    <SheetClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </KnowledgeCollapsible>

            {/* ── File size limit Section ── */}
            <div className="space-y-2 pt-6">
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
                    {formatFileSize(totalFileSize)} of {formatFileSize(maxTotalSize)}
                  </span>
                </div>
                <Progress value={Math.min((totalFileSize / maxTotalSize) * 100, 100)} className="h-1" />
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteConfirm()}
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner className="size-4" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
