import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import {
  Loader2,
  Megaphone,
  Plus,
  Search,
  X,
  FileText,
  Info,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  WHATSAPP_DEMO_NEW_TEMPLATE_BODY,
  WHATSAPP_DEMO_NEW_TEMPLATE_NAME,
  WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
} from '@/lib/whatsappCloudDemo';
import { WhatsAppFeatureGate } from '@/components/WhatsAppFeatureGate';
type TemplateRow = {
  name: string;
  language: string;
  status: string;
  category: string;
  components?: Array<{ type: string; text?: string }>;
};

function TemplatesTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/30 select-none">
              <th className="px-4 py-3.5 font-semibold text-foreground/85">Template name</th>
              <th className="px-4 py-3.5 font-semibold text-foreground/85">Category</th>
              <th className="px-4 py-3.5 font-semibold text-foreground/85">Language & Preview</th>
              <th className="px-4 py-3.5 font-semibold text-foreground/85">Status</th>
              <th className="px-4 py-3.5 font-semibold text-foreground/85 text-center">
                <span className="flex items-center justify-center gap-1">
                  Message sent
                  <Info className="size-3 text-muted-foreground/60" />
                </span>
              </th>
              <th className="px-4 py-3.5 font-semibold text-foreground/85 text-center">
                <span className="flex items-center justify-center gap-1">
                  Message opened
                  <Info className="size-3 text-muted-foreground/60" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-b border-border last:border-b-0">
                <td className="px-4 py-4.5">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="px-4 py-4.5">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="px-4 py-4.5">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-12" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </td>
                <td className="px-4 py-4.5">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </td>
                <td className="px-4 py-4.5 text-center">
                  <div className="flex justify-center">
                    <Skeleton className="h-4 w-8" />
                  </div>
                </td>
                <td className="px-4 py-4.5 text-center">
                  <div className="flex justify-center">
                    <Skeleton className="h-4 w-8" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border/60 px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground/50 bg-muted/5 font-medium">
        <Skeleton className="h-3.5 w-36" />
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const listTemplates = useAction(api.whatsappBroadcast.listTemplates);
  const createTemplate = useAction(api.whatsappBroadcast.createTemplate);

  const [channelId, setChannelId] = useState<Id<'channels'> | ''>('');
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Create template dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [tplName, setTplName] = useState(WHATSAPP_DEMO_NEW_TEMPLATE_NAME);
  const [tplLang, setTplLang] = useState(WHATSAPP_DEMO_TEMPLATE_LANGUAGE);
  const [tplCategory, setTplCategory] = useState('UTILITY');
  const [tplBody, setTplBody] = useState(WHATSAPP_DEMO_NEW_TEMPLATE_BODY);

  const whatsappReady = useMemo(() => {
    if (!channels) return [];
    return channels.filter(
      (c: any) =>
        c.service === 'whatsapp' &&
        c.status === 'connected' &&
        Boolean(c.wabaId?.trim()) &&
        Boolean(c.phoneNumberId?.trim()),
    );
  }, [channels]);

  useEffect(() => {
    if (!channelId && whatsappReady.length > 0) {
      setChannelId(whatsappReady[0]._id);
    }
  }, [channelId, whatsappReady]);

  const loadTemplates = useCallback(async () => {
    if (!channelId) {
      setTemplates([]);
      return;
    }
    setLoading(true);
    try {
      const { templates: rows } = await listTemplates({
        channelId: channelId as Id<'channels'>,
      });
      setTemplates(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [channelId, listTemplates]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const catMatch = selectedCategory === 'ALL' || t.category === selectedCategory;
      const statusMatch =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'APPROVED' && t.status === 'APPROVED') ||
        (selectedStatus === 'IN_REVIEW' && t.status !== 'APPROVED');

      return nameMatch && catMatch && statusMatch;
    });
  }, [templates, searchQuery, selectedCategory, selectedStatus]);

  const handleCreateTemplate = async () => {
    if (!channelId) return;
    const n = tplName.trim();
    const b = tplBody.trim();
    if (!n || !b) {
      toast.error('Template name and body are required.');
      return;
    }
    setCreateBusy(true);
    try {
      await createTemplate({
        channelId: channelId as Id<'channels'>,
        name: n,
        language: tplLang.trim() || WHATSAPP_DEMO_TEMPLATE_LANGUAGE,
        category: tplCategory.trim() || 'UTILITY',
        bodyText: b,
      });
      toast.success('Template submitted to Meta for review.');
      setCreateOpen(false);
      await loadTemplates();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setCreateBusy(false);
    }
  };

  // Unique categories for the dropdown
  const categories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [templates]);

  if (channels === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <WhatsAppFeatureGate feature="Message Templates">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 animate-fade-in pb-12 px-4 md:px-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-6">
        <div>
          <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground leading-tight">
            Message templates
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadTemplates().then(() => toast.success('Templates refreshed'))}
            disabled={loading}
            className="h-9 px-3 gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-9 px-4 gap-1.5 font-semibold text-sm shadow-sm"
          >
            <Plus className="size-4" />
            Create Template
          </Button>
        </div>
      </header>

      {/* FILTER & SEARCH PANEL */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search template name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9.5 text-xs bg-background border border-neutral-300 dark:border-neutral-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Selector */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[140px] bg-background border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Selector */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px] bg-background border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="IN_REVIEW">Under Review</SelectItem>
            </SelectContent>
          </Select>

          {(selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="h-9.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* TEMPLATES LIST TABLE */}
      {loading && templates.length === 0 ? (
        <TemplatesTableSkeleton />
      ) : filteredTemplates.length === 0 ? (
        <Empty className="border border-dashed bg-muted/10 py-16 rounded-xl w-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-base font-semibold">No templates found</EmptyTitle>
            <EmptyDescription className="text-xs max-w-sm mx-auto">
              {templates.length === 0
                ? 'Create a new template to get started with WhatsApp Broadcasts.'
                : 'No templates match your current filters and search query.'}
            </EmptyDescription>
          </EmptyHeader>
          {templates.length === 0 && (
            <EmptyContent>
              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="h-9 text-xs px-4 gap-1.5"
              >
                <Plus className="size-3.5" />
                Create Template
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 select-none">
                  <th className="px-4 py-3.5 font-semibold text-foreground/85">Template name</th>
                  <th className="px-4 py-3.5 font-semibold text-foreground/85">Category</th>
                  <th className="px-4 py-3.5 font-semibold text-foreground/85">Language & Preview</th>
                  <th className="px-4 py-3.5 font-semibold text-foreground/85">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-foreground/85 text-center">
                    <span className="flex items-center justify-center gap-1">
                      Message sent
                      <Info className="size-3 text-muted-foreground/60" />
                    </span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-foreground/85 text-center">
                    <span className="flex items-center justify-center gap-1">
                      Message opened
                      <Info className="size-3 text-muted-foreground/60" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTemplates.map((t, index) => {
                  const bodyPreview = t.components?.find((c) => c.type === 'BODY')?.text ?? '';
                  const isApproved = t.status === 'APPROVED';

                  // Simulated stats: matching the mockup's 0 count, but clean and ready.
                  const sentCount = 0;
                  const openedCount = 0;

                  return (
                    <tr
                      key={`${t.name}-${t.language}-${index}`}
                      onClick={() => navigate(`/dashboard/${agentId}/templates/${t.name}?lang=${t.language}`)}
                      className="hover:bg-accent/25 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-4 font-semibold text-foreground text-sm max-w-[200px] truncate">
                        {t.name}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground text-sm font-medium capitalize">
                        {t.category.toLowerCase()}
                      </td>
                      <td className="px-4 py-4 max-w-[320px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground text-sm">{t.language}</span>
                          <span className="text-[13px] text-muted-foreground truncate" title={bodyPreview}>
                            {bodyPreview || 'No content preview.'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-800/40 px-2.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                          <span className={`size-1.5 rounded-full shrink-0 ${isApproved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          <span>
                            {isApproved ? 'Approved' : 'In review'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-muted-foreground font-mono font-medium text-sm">
                        {sentCount}
                      </td>
                      <td className="px-4 py-4 text-center text-muted-foreground font-mono font-medium text-sm">
                        {openedCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/60 px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground/50 bg-muted/5 font-medium">
            <span>
              Showing {filteredTemplates.length} of {templates.length} templates
            </span>
          </div>
        </div>
      )}

      {/* CREATE TEMPLATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create message template</DialogTitle>
            <DialogDescription>
              Submits a utility-style template to Meta for review. Category and
              content must comply with WhatsApp policies.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-left">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                disabled={createBusy}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-lang">Language</Label>
                <Input
                  id="tpl-lang"
                  value={tplLang}
                  onChange={(e) => setTplLang(e.target.value)}
                  disabled={createBusy}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-cat">Category</Label>
                <Input
                  id="tpl-cat"
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value)}
                  disabled={createBusy}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-body">Body</Label>
              <Textarea
                id="tpl-body"
                rows={4}
                value={tplBody}
                onChange={(e) => setTplBody(e.target.value)}
                disabled={createBusy}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createBusy}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateTemplate()} disabled={createBusy} className="gap-2">
              {createBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit to Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </WhatsAppFeatureGate>
  );
}
