import { useState, useMemo } from 'react';
import { useAction, useQuery } from 'convex/react';
import { usePostHog } from '@posthog/react';
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Trash2, Check, ChevronDown, ArrowRight, X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toast } from "sonner";
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import {
  formatFileSize,
  isValidUrl,
  KnowledgeBaseEmptyState,
  type OpenDeleteDialog,
} from './helpers';
import { hasParentWebUrl } from '../../../shared/webEntryUrl';
import { WebLinkEntry } from './WebLinkEntry';
import { WebKnowledgeModal } from './WebKnowledgeModal';
import { WebsiteResearchUpgrade } from './WebsiteResearchUpgrade';
import { PLAN_CATALOG, type PlanKey } from '../../../shared/planCatalog';

type WebEntry = {
  _id: Id<'webEntries'>;
  url: string;
  status?: string;
  createdAt: number;
  fileSize?: number;
  cfItemId?: string;
  parentId?: Id<'webEntries'>;
  markdownR2Key?: string;
};

interface WebSectionProps {
  entries: WebEntry[] | undefined;
  agentId: Id<'agents'> | undefined;
  openDeleteDialog: OpenDeleteDialog;
  canManage?: boolean;
}

function webProgressLabel(status?: string) {
  if (status === 'gettingLinks') return 'Researching...';
  if (status === 'gettingMarkdown') return 'Embedding...';
  return null;
}

function WebRowStatus({ status }: { status?: string }) {
  if (status === 'completed') {
    return (
      <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600">
        <Check className="size-2.5 text-white" />
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div
        className="flex size-4 shrink-0 items-center justify-center rounded-full bg-red-600"
        aria-label="Failed"
      >
        <X className="size-2.5 text-white" />
      </div>
    );
  }
  return <Spinner className="size-4 shrink-0 text-yellow-500" />;
}

export function WebSection({ entries, agentId, openDeleteDialog, canManage = true }: WebSectionProps) {
  const posthog = usePostHog();
  const enqueueWebResearch = useAction(api.webResearch.enqueue.enqueueWebResearch);
  const planAndUsage = useQuery(api.plans.getPlanAndUsage, {});
  const canResearchWeb = Boolean(
    planAndUsage?.plan
    && PLAN_CATALOG[planAndUsage.plan as PlanKey]?.features.website_research,
  );

  const [webInput, setWebInput] = useState("");
  const [webInputError, setWebInputError] = useState<string | null>(null);
  const [isQueuing, setIsQueuing] = useState(false);
  const [editingWebEntry, setEditingWebEntry] = useState<WebEntry | null>(null);

  const handleAddWebsite = async () => {
    const trimmed = webInput.trim();
    if (!trimmed || !agentId) return;
    if (!isValidUrl(trimmed)) { setWebInputError("Please enter a valid URL (e.g. https://example.com)"); return; }
    if (hasParentWebUrl(entries ?? [], trimmed)) { setWebInputError("This URL has already been added"); return; }
    setWebInputError(null);
    setIsQueuing(true);
    try {
      await enqueueWebResearch({ agentId, url: trimmed });
      posthog?.capture('knowledge_base_item_added', { type: 'web' });
      toast.success("Website queued for research");
      setWebInput("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already been added")) setWebInputError("This URL has already been added");
      else toast.error("Failed to research this website");
    } finally { setIsQueuing(false); }
  };

  const groupedWeb = useMemo(() => {
    const list = entries ?? [];
    const childrenByParent = new Map<string, WebEntry[]>();
    for (const entry of list) {
      if (!entry.parentId) continue;
      const key = String(entry.parentId);
      const children = childrenByParent.get(key) ?? [];
      children.push(entry);
      childrenByParent.set(key, children);
    }
    return list
      .filter((entry) => !entry.parentId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((parent) => ({
        parent,
        children: childrenByParent.get(String(parent._id)) ?? [],
      }));
  }, [entries]);

  const hasEntries = (entries ?? []).length > 0;

  if (!canManage && !hasEntries) {
    return <KnowledgeBaseEmptyState />;
  }

  return (
    <>
      {canManage && planAndUsage !== undefined && !canResearchWeb ? (
        <WebsiteResearchUpgrade />
      ) : null}
      {canManage && canResearchWeb ? (
      <WebLinkEntry>
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <Input
                value={webInput}
                onChange={(e) => { setWebInput(e.target.value); setWebInputError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddWebsite(); }}
                placeholder="https://example.com"
                className={cn(
                  "border-border bg-background pr-12",
                  webInputError && "border-destructive focus-visible:ring-destructive",
                )}
              />
              <button
                type="button"
                onClick={handleAddWebsite}
                disabled={isQueuing || !webInput.trim()}
                aria-label="Research website"
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-black text-white transition-opacity hover:bg-black/90 disabled:opacity-40"
              >
                {isQueuing ? <Spinner className="size-3 text-white" /> : <ArrowRight className="size-3.5" />}
              </button>
            </div>
            {webInputError && <p className="text-xs text-destructive">{webInputError}</p>}
          </div>
        </div>
      </WebLinkEntry>
      ) : null}

      {hasEntries && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">{canManage ? 'Your web' : 'Sources'}</h2>
          <div className="space-y-2">
            {groupedWeb.map(({ parent, children }) => {
              const progress = webProgressLabel(parent.status);
              const canOpen = Boolean(parent.markdownR2Key) || parent.status === "completed";

              if (children.length === 0) {
                return (
                  <div
                    key={parent._id}
                    onClick={canOpen ? () => setEditingWebEntry(parent) : undefined}
                    className={`group flex items-center justify-between rounded-md bg-muted px-4 py-3 ${canOpen ? 'cursor-pointer hover:bg-muted/80' : ''} transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <WebRowStatus status={parent.status} />
                      <span className="text-sm truncate">{parent.url}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {progress ? <Shimmer duration={2} spread={1}>{progress}</Shimmer> : null}
                      {!progress && parent.status === "completed" && parent.fileSize ? (
                        <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem] text-right">{formatFileSize(parent.fileSize)}</span>
                      ) : null}
                      {canManage ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('web', parent._id, parent.cfItemId); }} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors">
                        <Trash2 className="size-3.5" />
                      </button>
                      ) : null}
                    </div>
                  </div>
                );
              }

              const allDone = [parent, ...children].every((entry) => entry.status === "completed");
              return (
                <Collapsible key={parent._id} className="group rounded-md bg-muted">
                  <div className="relative flex items-center hover:bg-muted/80 transition-colors">
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <WebRowStatus status={allDone ? 'completed' : parent.status} />
                        <span className="text-sm truncate">{parent.url}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pr-8">
                        {allDone ? (
                          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        ) : progress ? (
                          <Shimmer duration={2} spread={1}>{progress}</Shimmer>
                        ) : null}
                      </div>
                    </CollapsibleTrigger>
                    {canManage ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('web', parent._id, parent.cfItemId, true); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors">
                      <Trash2 className="size-3.5" />
                    </button>
                    ) : null}
                  </div>
                  <CollapsibleContent>
                    <div className="border-t border-border px-4 py-3">
                      <div className="space-y-2">
                        {children.map((entry) => {
                          const childProgress = webProgressLabel(entry.status);
                          const childCanOpen = Boolean(entry.markdownR2Key) || entry.status === "completed";
                          return (
                            <div key={entry._id} onClick={childCanOpen ? () => setEditingWebEntry(entry) : undefined} className={`group flex items-center justify-between rounded-md bg-background px-4 py-2.5 ${childCanOpen ? 'cursor-pointer hover:bg-muted/80' : ''} transition-colors`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <WebRowStatus status={entry.status} />
                                <span className={`text-sm truncate ${entry.status === "deleting" ? "line-through opacity-50" : ""}`}>{entry.url}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {childProgress ? <Shimmer duration={2} spread={1}>{childProgress}</Shimmer> : null}
                                {!childProgress && entry.fileSize ? <span className="text-xs text-muted-foreground tabular-nums min-w-[4.5rem] text-right">{formatFileSize(entry.fileSize)}</span> : null}
                                {canManage ? (
                                <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteDialog('web', entry._id, entry.cfItemId); }} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
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

      {editingWebEntry !== null ? (
        <WebKnowledgeModal
          key={editingWebEntry._id}
          entry={editingWebEntry}
          canManage={canManage}
          canEdit={canManage && canResearchWeb}
          onClose={() => setEditingWebEntry(null)}
          openDeleteDialog={openDeleteDialog}
        />
      ) : null}
    </>
  );
}
