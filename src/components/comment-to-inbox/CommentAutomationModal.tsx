import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { Check, Loader2, X } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { CommentAutomationPreview } from '@/components/comment-to-inbox/CommentAutomationPreview';
import { getCommentAutomationValidationErrors } from '@/components/comment-to-inbox/commentAutomationValidation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CHANNEL_SERVICE_META } from '@/lib/channelServiceMeta';
import { isTesting } from '../../../shared/commentAutomationConfig';
import { toast } from 'sonner';

type Channel = {
  _id: Id<'channels'>;
  service: 'instagram' | 'messenger';
  displayUsername?: string;
  pageId?: string;
  igUserId?: string;
};

type Automation = {
  _id: Id<'commentAutomations'>;
  name: string;
  trigger: 'any_comment' | 'keywords';
  keywords: string[];
  privateMessage: string;
  publicReply?: string;
};

function getInitialChannelIds(channels: Channel[], initialChannelIds?: Id<'channels'>[]) {
  if (isTesting && initialChannelIds?.length === 0) return channels.map((channel) => channel._id);
  return initialChannelIds ?? channels.map((channel) => channel._id);
}

export function CommentAutomationModal({
  automation,
  channels,
  initialChannelIds,
  loading = false,
  open,
  onOpenChange,
}: {
  automation?: Automation;
  channels: Channel[];
  initialChannelIds?: Id<'channels'>[];
  loading?: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const create = useMutation(api.commentAutomations.create);
  const update = useMutation(api.commentAutomations.update);
  const [name, setName] = useState(automation?.name ?? '');
  const [channelIds, setChannelIds] = useState<Id<'channels'>[]>(() => getInitialChannelIds(channels, initialChannelIds));
  const [keywords, setKeywords] = useState<string[]>(automation?.keywords ?? []);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keywordInputOpen, setKeywordInputOpen] = useState(false);
  const [privateMessage, setPrivateMessage] = useState(automation?.privateMessage ?? '');
  const [replyPublicly, setReplyPublicly] = useState(Boolean(automation?.publicReply));
  const [publicReply, setPublicReply] = useState(automation?.publicReply ?? '');
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({ name: false, privateMessage: false });
  const loadedAutomationId = useRef<Id<'commentAutomations'> | null>(null);
  const selectedIds = useMemo(() => new Set(channelIds), [channelIds]);
  const selectedChannels = useMemo(() => channels.filter((channel) => selectedIds.has(channel._id)), [channels, selectedIds]);
  const trigger: Automation['trigger'] = keywords.length > 0 ? 'keywords' : 'any_comment';
  const isEditing = loading || Boolean(automation);

  useEffect(() => {
    if (!automation || loadedAutomationId.current === automation._id) return;
    setName(automation.name);
    setChannelIds(getInitialChannelIds(channels, initialChannelIds));
    setKeywords(automation.keywords);
    setKeywordDraft('');
    setKeywordInputOpen(false);
    setPrivateMessage(automation.privateMessage);
    setReplyPublicly(Boolean(automation.publicReply));
    setPublicReply(automation.publicReply ?? '');
    setValidationErrors({ name: false, privateMessage: false });
    loadedAutomationId.current = automation._id;
  }, [automation, channels, initialChannelIds]);

  const toggleChannel = (channelId: Id<'channels'>) => {
    setChannelIds((current) => current.includes(channelId)
      ? current.filter((id) => id !== channelId)
      : [...current, channelId]);
  };

  const addKeywords = (value: string) => {
    const nextKeywords = value
      .split(',')
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);
    if (nextKeywords.length === 0) return;

    setKeywords((current) => [...current, ...nextKeywords.filter((keyword) => (
      !current.some((existing) => existing.toLowerCase() === keyword.toLowerCase())
    ))]);
    setKeywordDraft('');
    setKeywordInputOpen(false);
  };

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords((current) => current.filter((keyword) => keyword !== keywordToRemove));
  };

  const save = async () => {
    const nextValidationErrors = getCommentAutomationValidationErrors(name, privateMessage);
    if (nextValidationErrors.name || nextValidationErrors.privateMessage) {
      setValidationErrors(nextValidationErrors);
      return;
    }

    setValidationErrors({ name: false, privateMessage: false });
    setSaving(true);
    try {
      const input = {
        name,
        channelIds: isTesting ? [] : channelIds,
        trigger,
        keywords,
        privateMessage,
        publicReply: replyPublicly ? publicReply : undefined,
      };
      if (automation) {
        await update({ automationId: automation._id, ...input });
      } else {
        await create(input);
      }
      setName('');
      setChannelIds(channels.map((channel) => channel._id));
      setKeywords([]);
      setKeywordDraft('');
      setKeywordInputOpen(false);
      setPrivateMessage('');
      setPublicReply('');
      setReplyPublicly(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save automation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader><DialogTitle>{isEditing ? 'Automation Details' : 'New automation'}</DialogTitle></DialogHeader>
        {loading ? (
          <div role="status" aria-label="Loading automation details" className="grid gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
          <div className="grid gap-0">
          <div className="grid grid-cols-2 gap-2">{channels.map((channel) => {
            const meta = CHANNEL_SERVICE_META[channel.service];
            const ChannelIcon = meta.icon;
            const channelName = channel.displayUsername ?? channel.pageId ?? channel.igUserId;
            return (
              <button
                key={channel._id}
                type="button"
                aria-pressed={selectedIds.has(channel._id)}
                aria-label={`Use ${channelName} for this automation`}
                className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${selectedIds.has(channel._id) ? 'border-[3px] border-emerald-700 bg-white text-foreground dark:border-emerald-400 dark:bg-background' : 'border-border bg-background text-muted-foreground hover:bg-muted/50'}`}
                onClick={() => toggleChannel(channel._id)}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <ChannelIcon className={`size-4 ${meta.iconColor}`} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{channelName}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{meta.label}</span>
                </span>
              </button>
            );
          })}</div>
          <div className="mt-3 grid gap-1.5" aria-live="polite">
            {selectedChannels.map((channel) => {
              const channelName = channel.displayUsername ?? channel.pageId ?? channel.igUserId;
              return <p key={channel._id} className="flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="size-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" /><span>Automation will be live for {channelName}</span></p>;
            })}
            {selectedChannels.length === 0 ? <p className="text-xs text-destructive">At least one page is needed.</p> : null}
          </div>
          <div className="mt-6 grid gap-1.5 border-t pt-6">
            <label className="grid gap-1.5 text-sm font-medium">Name<Input value={name} aria-invalid={validationErrors.name} onChange={(event) => { setName(event.target.value); setValidationErrors((current) => ({ ...current, name: false })); }} /></label>
            {validationErrors.name ? <p className="text-xs font-normal text-destructive">Name is required.</p> : null}
          </div>
          <div className="mt-6 grid gap-4 border-t pt-6">
          <div className="grid gap-2"><span className="text-sm font-medium">If comment contains</span><div className="flex flex-wrap items-center gap-2">
            {keywords.map((keyword) => <span key={keyword} className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs">
              {keyword}
              <button type="button" aria-label={`Remove ${keyword}`} className="text-muted-foreground transition-colors hover:text-foreground" onClick={() => removeKeyword(keyword)}><X className="size-3" aria-hidden="true" /></button>
            </span>)}
            {keywordInputOpen ? <Input autoFocus value={keywordDraft} onChange={(event) => setKeywordDraft(event.target.value)} onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addKeywords(keywordDraft);
              }
            }} onBlur={() => {
              addKeywords(keywordDraft);
              setKeywordInputOpen(false);
            }} placeholder="Keyword" className="h-8 w-32" /> : <Button type="button" variant="outline" className="h-8 rounded-full border-dashed px-3" onClick={() => setKeywordInputOpen(true)}>+ Keyword</Button>}
          </div></div>
          <div className="grid gap-2"><span className="text-sm font-medium">Send message</span>
            <div className="grid gap-1.5"><Textarea aria-label="Message to send" aria-invalid={validationErrors.privateMessage} value={privateMessage} onChange={(event) => { setPrivateMessage(event.target.value); setValidationErrors((current) => ({ ...current, privateMessage: false })); }} /></div>
            {validationErrors.privateMessage ? <p className="text-xs font-normal text-destructive">Send message is required.</p> : null}
          </div>
          </div>
          <div className="mt-6 grid gap-2 border-t pt-6">
            <div className="grid gap-1.5"><div className="flex items-center justify-between text-sm font-medium"><span>Reply to comment?</span><Switch checked={replyPublicly} onCheckedChange={setReplyPublicly} /></div><p className="text-xs font-normal text-muted-foreground">This is what you'll reply when someone comments with a matching keyword.</p></div>
            {replyPublicly && <label className="grid gap-1.5 text-sm font-medium">Message<Textarea value={publicReply} onChange={(event) => setPublicReply(event.target.value)} /></label>}
          </div>
          </div>
          <CommentAutomationPreview
            keywordText={keywords.join(', ')}
            privateMessage={privateMessage}
            publicReply={replyPublicly ? publicReply : ''}
          />
        </div>
        )}
        <DialogFooter><Button onClick={() => void save()} disabled={loading || saving || selectedChannels.length === 0} aria-busy={loading || saving}>{loading ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading…</> : saving ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />Saving…</> : automation ? 'Save changes' : 'Save automation'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
