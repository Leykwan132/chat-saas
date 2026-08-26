import { useState, useMemo } from 'react';
import { useAction, useQuery } from 'convex/react';
import { usePostHog } from '@posthog/react';
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Trash2,
  X,
  Check,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import {
  formatFileSize,
  formatTimeAgo,
  StatusBadge,
  isValidUrl,
  KnowledgeBaseEmptyState,
  type OpenDeleteDialog,
} from './helpers';
import { hasParentWebUrl } from '../../../shared/webEntryUrl';
import { WebLinkEntry } from './WebLinkEntry';
import { WebEntryDetails } from './WebEntryDetails';

interface WebSectionProps {
  entries: any[] | undefined;
  agentId: Id<'agents'> | undefined;
  openDeleteDialog: OpenDeleteDialog;
  canManage?: boolean;
}

export function WebSection({ entries, agentId, openDeleteDialog, canManage = true }: WebSectionProps) {
  const posthog = usePostHog();
  const enqueueLinkDiscovery = useAction(api.cloudflare.enqueueLinkDiscovery);
  const enqueueDelete = useAction(api.cloudflare.enqueueDelete);

  const [webInput, setWebInput] = useState("");
  const [webInputError, setWebInputError] = useState<string | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [isSearchingLinks, setIsSearchingLinks] = useState(false);
  const [searchSourceUrl, setSearchSourceUrl] = useState("");
  const [editingWebEntry, setEditingWebEntry] = useState<any | null>(null);
  const webEntryMarkdown = useQuery(
    api.knowledgeBase.getWebEntryMarkdown,
    editingWebEntry ? { entryId: editingWebEntry._id } : "skip",
  );

  const handleSearchWeb = async () => {
    const trimmed = webInput.trim();
    if (!trimmed || !agentId) return;
    if (!isValidUrl(trimmed)) { setWebInputError("Please enter a valid URL (e.g. https://example.com)"); return; }
    if (hasParentWebUrl(entries ?? [], trimmed)) { setWebInputError("This URL has already been added"); return; }
    setWebInputError(null);
    setIsSearchingLinks(true);
    try {
      await enqueueLinkDiscovery({ agentId, url: trimmed });
      setSearchSourceUrl(trimmed);
      posthog?.capture('knowledge_base_item_added', { type: 'web' });
      toast.success("URL queued for processing");
      setWebInput("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already been added")) setWebInputError("This URL has already been added");
      else toast.error("Failed to discover links from this URL");
      setSearchSourceUrl("");
    } finally { setIsSearchingLinks(false); }
  };

  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntryIds((prev) => { const next = new Set(prev); next.has(entryId) ? next.delete(entryId) : next.add(entryId); return next; });
  };

  const removeDiscoveredLink = (entryId: Id<"webEntries">) => {
    setSelectedEntryIds((prev) => { const next = new Set(prev); next.delete(entryId); return next; });
    enqueueDelete({ entryId, entryType: "web" });
  };

  const groupedWeb = useMemo(() => {
    const map = new Map<string, { parent: any; children: any[] }>();
    (entries ?? []).forEach(entry => {
      if (!entry.parentId) {
        const key = String(entry._id);
        if (!map.has(key)) map.set(key, { parent: entry, children: [] });
      }
    });
    (entries ?? []).forEach(entry => {
      if (entry.parentId) {
        const key = String(entry.parentId);
        const group = map.get(key);
        if (group) group.children.push(entry);
      }
    });
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.parent.createdAt - a.parent.createdAt)
      .map(([id, group]) => [id, group.parent.url as string, [group.parent, ...group.children]] as const);
  }, [entries]);

  const hasEntries = (entries ?? []).length > 0;

  if (!canManage && !hasEntries) {
    return <KnowledgeBaseEmptyState />;
  }

  return (
    <>
      {canManage ? (
      <WebLinkEntry>
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <Input
                value={webInput}
                onChange={(e) => { setWebInput(e.target.value); setWebInputError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearchWeb(); }}
                placeholder="https://example.com"
                className={cn(
                  "pr-12",
                  webInputError && "border-destructive focus-visible:ring-destructive",
                )}
              />
              <button
                type="button"
                onClick={handleSearchWeb}
                disabled={isSearchingLinks || !webInput.trim()}
                aria-label="Add links"
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-black text-white transition-opacity hover:bg-black/90 disabled:opacity-40"
              >
                {isSearchingLinks ? <Spinner className="size-3 text-white" /> : <ArrowRight className="size-3.5" />}
              </button>
            </div>
            {webInputError && <p className="text-xs text-destructive">{webInputError}</p>}
          </div>
          {!isSearchingLinks && (() => {
            const pendingLinks = (entries ?? []).filter(e => e.parentUrl === searchSourceUrl && e.status === "gettingLinks");
            if (pendingLinks.length > 0) {
              return (
                <div className="space-y-0.5 max-h-56 overflow-y-auto rounded-lg border border-border">
                  {pendingLinks.map((entry) => (
                    <div key={entry._id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0">
                      <button type="button" onClick={() => toggleEntrySelection(entry._id)} className={`flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${selectedEntryIds.has(entry._id) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                        {selectedEntryIds.has(entry._id) && <Check className="size-3" />}
                      </button>
                      <span className="flex-1 text-sm truncate">{entry.url}</span>
                      <button type="button" onClick={() => removeDiscoveredLink(entry._id)} className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"><X className="size-3.5" /></button>
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          })()}
        </div>
      </WebLinkEntry>
      ) : null}

      {hasEntries && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">{canManage ? 'Your web' : 'Sources'}</h2>
          <div className="space-y-2">
            {groupedWeb.map(([id, parentUrl, groupEntries]) => {
              const parent = groupEntries.find((e: any) => !e.parentUrl || e.url === parentUrl);
              const parentStatus = parent?.status;
              const allDone = groupEntries.every((e: any) => e.status === "completed");
              const childLinks = groupEntries.filter((e: any) => e.parentUrl);
              const isResearching = parentStatus === "gettingMarkdown";
              const isGettingLinks = parentStatus === "gettingLinks";

              if (isGettingLinks) {
                return (
                  <div key={id} className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Spinner className="size-4 shrink-0 text-yellow-500" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{parentUrl}</span>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(parent?.createdAt ?? Date.now())}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Shimmer duration={2} spread={1}>Exploring...</Shimmer>
                      {canManage ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('web', parent._id, parent.cfItemId, true); }} className="rounded p-1 text-destructive hover:bg-background transition-colors">
                        <Trash2 className="size-3.5" />
                      </button>
                      ) : null}
                    </div>
                  </div>
                );
              }

              return (
                <Collapsible key={id} className="group rounded-lg border border-border bg-card">
                  <div className="relative flex items-center hover:bg-muted/50 transition-colors">
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        {allDone ? (
                          <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600"><Check className="size-2.5 text-white" /></div>
                        ) : (
                          <Spinner className="size-4 shrink-0 text-yellow-500" />
                        )}
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{parentUrl}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{formatTimeAgo(parent?.createdAt ?? Date.now())}</span>
                            {allDone && <span className="text-xs text-muted-foreground">· {childLinks.length} link{childLinks.length !== 1 ? 's' : ''}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pr-8">
                        {allDone ? (
                          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        ) : isResearching ? (
                          <Shimmer duration={2} spread={1}>Researching...</Shimmer>
                        ) : null}
                      </div>
                    </CollapsibleTrigger>
                    {canManage ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('web', parent._id, parent.cfItemId, true); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-destructive hover:bg-background transition-colors">
                      <Trash2 className="size-3.5" />
                    </button>
                    ) : null}
                  </div>
                  <CollapsibleContent>
                    <div className="border-t border-border px-4 py-3">
                      <div className="space-y-2">
                        {childLinks.map((entry: any) => {
                          const isGettingMarkdown = entry.status === "gettingMarkdown";
                          return (
                            <div key={entry._id} onClick={canManage ? () => setEditingWebEntry(entry) : undefined} className={`group flex items-center justify-between rounded-md bg-muted px-4 py-2.5 ${canManage ? 'cursor-pointer hover:bg-muted/80' : ''} transition-colors`}>
                              <div className="flex items-center gap-2 min-w-0">
                                {entry.status === "completed" ? (
                                  <div className="flex size-2 shrink-0 rounded-full bg-emerald-500" />
                                ) : (
                                  <Spinner className="size-3 shrink-0 text-yellow-500" />
                                )}
                                <span className={`text-sm truncate ${entry.status === "deleting" ? "line-through opacity-50" : ""}`}>{entry.url}</span>
                                <StatusBadge status={entry.status} />
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {!isGettingMarkdown && entry.fileSize > 0 && <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem] text-right">{formatFileSize(entry.fileSize)}</span>}
                                {canManage ? (
                                <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('web', entry._id, entry.cfItemId); }} className="rounded p-1 text-destructive hover:bg-background transition-colors"><Trash2 className="size-3.5" /></button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      )}

      {canManage && editingWebEntry !== null ? (
      <Sheet open={editingWebEntry !== null} onOpenChange={(open) => { if (!open) setEditingWebEntry(null); }}>
        <SheetContent className="sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>Web URL Details</SheetTitle>
            <SheetDescription>View the entry details.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-6 py-4 space-y-4">
            {editingWebEntry && <WebEntryDetails key={editingWebEntry._id} url={editingWebEntry.url} fileSizeLabel={formatFileSize(editingWebEntry.fileSize)} markdownUrl={webEntryMarkdown?.markdownUrl} isMarkdownLoading={webEntryMarkdown === undefined} />}
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2">
            {editingWebEntry && (
              <Button type="button" variant="destructive" onClick={() => { setEditingWebEntry(null); openDeleteDialog('web', editingWebEntry._id, editingWebEntry.cfItemId); }}><Trash2 className="size-4 mr-1" />Delete</Button>
            )}
            <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      ) : null}
    </>
  );
}
