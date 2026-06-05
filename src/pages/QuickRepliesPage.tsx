import { useState, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  ReplyAll,
  Plus,
  Search,
  Image as ImageIcon,
  Trash2,
  Edit2,
  X,
  Camera,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { uploadWithProgress } from '@/lib/r2Upload';
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from '@/components/ui/avatar';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r2ClientApi = (api as any).media?.r2Client;

export default function QuickRepliesPage() {
  const quickReplies = useQuery(api.quickReplies.list);
  const createQuickReply = useMutation(api.quickReplies.create);
  const updateQuickReply = useMutation(api.quickReplies.update);
  const removeQuickReply = useMutation(api.quickReplies.remove);

  const userAccess = useQuery(api.teamAccess.getCurrentUserAccess, {});
  const canManage = userAccess?.role === 'owner' || userAccess?.role === 'admin';

  const generateUploadUrl = useMutation(r2ClientApi?.generateUploadUrl);
  const syncMetadata = useAction(r2ClientApi?.syncMetadata);

  interface MediaAttachment {
    id: string;
    url: string;
    r2Key?: string;
    clientId?: string;
    file?: File;
    isUploading?: boolean;
    progress?: number;
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<any | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deletingReply, setDeletingReply] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredReplies = useMemo(() => {
    if (!quickReplies) return [];
    return quickReplies.filter(
      (reply) =>
        reply.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reply.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [quickReplies, searchQuery]);

  const openCreateDialog = () => {
    setEditingReply(null);
    setTitle('');
    setText('');
    setAttachments([]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (reply: any) => {
    setEditingReply(reply);
    setTitle(reply.title);
    setText(reply.text);

    const initialAttachments: MediaAttachment[] = [];
    if (reply.imageUrls && reply.imageUrls.length > 0) {
      reply.imageUrls.forEach((url: string, index: number) => {
        const key = reply.r2Keys?.[index] || reply.r2Key;
        if (key) {
          initialAttachments.push({
            id: crypto.randomUUID(),
            url,
            r2Key: key,
          });
        }
      });
    }
    setAttachments(initialAttachments);
    setIsDialogOpen(true);
  };

  const isCurrentlyUploading = attachments.some(att => att.isUploading);

  const uploadSingleFile = async (att: MediaAttachment) => {
    const file = att.file!;
    const clientId = crypto.randomUUID();

    try {
      if (!generateUploadUrl || !syncMetadata) {
        throw new Error('Upload APIs not available');
      }

      const { url, key } = await generateUploadUrl({
        clientId,
        mediaType: file.type,
        filename: file.name,
      });

      await uploadWithProgress(url, file, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setAttachments(prev =>
          prev.map(item =>
            item.id === att.id ? { ...item, progress: pct } : item
          )
        );
      });

      await syncMetadata({ key, clientId });

      setAttachments(prev =>
        prev.map(item =>
          item.id === att.id
            ? { ...item, isUploading: false, progress: undefined, clientId }
            : item
        )
      );
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload ${file.name}`);
      setAttachments(prev => prev.filter(item => item.id !== att.id));
    }
  };

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast.error('Only image uploads are supported');
    }
    if (imageFiles.length === 0) return;

    const newAttachments: MediaAttachment[] = imageFiles.map(file => {
      const id = crypto.randomUUID();
      return {
        id,
        url: URL.createObjectURL(file),
        file,
        isUploading: true,
        progress: 0,
      };
    });

    setAttachments(prev => [...prev, ...newAttachments]);

    for (const att of newAttachments) {
      if (!att.file) continue;
      void uploadSingleFile(att);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      toast.error('Shortcut and message content are required');
      return;
    }

    setIsSaving(true);

    try {
      const existingR2Keys = attachments
        .filter(att => att.r2Key && !att.isUploading)
        .map(att => att.r2Key!);

      const newImageClientIds = attachments
        .filter(att => att.clientId && !att.isUploading)
        .map(att => att.clientId!);

      if (editingReply) {
        await updateQuickReply({
          id: editingReply._id,
          title,
          text,
          imageClientIds: newImageClientIds,
          r2Keys: existingR2Keys,
        });
        toast.success('Quick reply updated');
      } else {
        await createQuickReply({
          title,
          text,
          imageClientIds: newImageClientIds,
        });
        toast.success('Quick reply created');
      }
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to save quick reply');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReply) return;
    setIsDeleting(true);
    try {
      await removeQuickReply({ id: deletingReply._id });
      toast.success('Quick reply deleted');
      setDeletingReply(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete quick reply');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 max-w-none">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">Quick Replies</h1>
        </div>
        <div className="flex shrink-0">
          {canManage && (
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="size-4" />
              New Reply
            </Button>
          )}
        </div>
      </header>

      {/* Filters & Search */}
      <div className="flex items-center w-full max-w-md relative">
        <Search className="absolute left-3 size-4 text-muted-foreground" />
        <Input
          placeholder="Search replies by title or text..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 w-full rounded-lg bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Main List Grid */}
      {quickReplies === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-xl border border-border bg-card p-4 min-h-[90px] animate-pulse">
              <div className="h-4 w-1/3 bg-muted rounded mb-2" />
              <div className="h-3 w-5/6 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filteredReplies.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-16 rounded-xl border border-dashed border-border/60 bg-card/45 min-h-[300px]">
          <div className="rounded-full bg-muted/65 p-4 mb-4">
            <ReplyAll className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No quick replies found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            {searchQuery ? "Try refining your search query." : "Configure shortcuts for quick answers to customer messages."}
          </p>
          {!searchQuery && canManage && (
            <Button onClick={openCreateDialog} variant="outline" className="mt-4 gap-2">
              <Plus className="size-3.5" />
              Create the first reply
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
          {filteredReplies.map((reply) => (
            <div
              key={reply._id}
              className="group relative flex items-center justify-between gap-3 rounded-xl border border-border bg-card hover:bg-card/80 hover:border-border/100 transition-all duration-200 p-3 h-fit"
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-sm tracking-tight truncate">
                    {reply.title}
                  </h3>
                  {canManage && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 rounded-md hover:bg-muted"
                        onClick={() => openEditDialog(reply)}
                        title="Edit"
                      >
                        <Edit2 className="size-3 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 rounded-md hover:bg-muted text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingReply(reply)}
                        title="Delete"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground text-xs font-normal truncate flex items-center gap-1.5 w-full">
                  {reply.imageUrls && reply.imageUrls.length > 0 && (
                    <ImageIcon className="size-3.5 text-muted-foreground/80 shrink-0" />
                  )}
                  <span className="truncate">{reply.text}</span>
                </p>
              </div>

              {reply.imageUrls && reply.imageUrls.length > 0 && (
                <div className="shrink-0 select-none">
                  <AvatarGroup className="-space-x-1.5">
                    {reply.imageUrls.map((url: string, idx: number) => (
                      <Avatar key={idx} size="sm" className="size-8 border border-background">
                        <AvatarImage src={url} alt="" />
                        <AvatarFallback className="text-[10px] font-semibold bg-muted">CN</AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => !isSaving && !isCurrentlyUploading && setIsDialogOpen(open)}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card border border-border/60">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Quick Reply
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 pt-0">
            <div className="space-y-2.5">
              <label htmlFor="reply-title" className="text-xs font-medium text-muted-foreground">
                Shortcut
              </label>
              <Input
                id="reply-title"
                placeholder="e.g. greeting, pricing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving || isCurrentlyUploading}
                maxLength={80}
                required
                className="bg-background border-border/85"
              />
            </div>

            <div className="space-y-2.5">
              <label htmlFor="reply-text" className="text-xs font-medium text-muted-foreground">
                Message
              </label>
              <Textarea
                id="reply-text"
                placeholder="Enter the template response text that will render in the message draft input..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isSaving || isCurrentlyUploading}
                rows={4}
                required
                className="bg-background border-border/85 min-h-[100px] leading-relaxed resize-y"
              />
            </div>

            <div className="space-y-2 pt-0.5">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative group size-16 overflow-hidden rounded-xl border border-border bg-muted flex items-center justify-center shrink-0"
                    >
                      <img
                        src={att.url}
                        alt=""
                        className="size-full object-cover"
                      />
                      {att.isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-[9px] font-semibold p-1">
                          <Spinner className="size-3 text-white mb-1" />
                          <span>{att.progress ?? 0}%</span>
                        </div>
                      )}
                      {!isSaving && !att.isUploading && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="absolute top-1 right-1 rounded-full bg-black/65 hover:bg-black/85 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFilesChange}
                    disabled={isSaving || isCurrentlyUploading}
                    className="hidden"
                  />
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${
                    (isSaving || isCurrentlyUploading) ? 'opacity-50 pointer-events-none' : ''
                  }`}>
                    {isCurrentlyUploading ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <Camera className="size-3.5" />
                    )}
                    Attach media
                  </div>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border/40 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving || isCurrentlyUploading}
                className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isCurrentlyUploading || !title.trim() || !text.trim()}
                className="w-full sm:w-auto gap-2"
              >
                {isSaving ? (
                  <>
                    <Spinner className="size-3.5" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingReply} onOpenChange={(open) => !open && setDeletingReply(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl bg-card border border-border/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" /> Delete Quick Reply
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deletingReply?.title}"</span>?
              This action cannot be undone, and teammates will no longer see it in the details panel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-border/40 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingReply(null)}
              disabled={isDeleting}
              className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto gap-2"
            >
              {isDeleting ? (
                <>
                  <Spinner className="size-3.5 text-destructive-foreground" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
