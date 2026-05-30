import { useState, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  MessageSquare,
  Plus,
  Search,
  Image as ImageIcon,
  Trash2,
  Edit2,
  X,
  Upload,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r2ClientApi = (api as any).media?.r2Client;

export default function QuickRepliesPage() {
  const quickReplies = useQuery(api.quickReplies.list);
  const createQuickReply = useMutation(api.quickReplies.create);
  const updateQuickReply = useMutation(api.quickReplies.update);
  const removeQuickReply = useMutation(api.quickReplies.remove);

  const generateUploadUrl = useMutation(r2ClientApi?.generateUploadUrl);
  const syncMetadata = useAction(r2ClientApi?.syncMetadata);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<any | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageClientId, setImageClientId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
    setImagePreview(null);
    setImageClientId(null);
    setUploadProgress(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (reply: any) => {
    setEditingReply(reply);
    setTitle(reply.title);
    setText(reply.text);
    setImagePreview(reply.imageUrl ?? null);
    setImageClientId(null); // Keep previous key unless user uploads new one
    setUploadProgress(null);
    setIsDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image uploads are supported');
      return;
    }

    setImagePreview(URL.createObjectURL(file));
    setIsUploading(true);
    setUploadProgress(0);

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

      await uploadWithProgress(url, file, (progress) => {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        setUploadProgress(pct);
      });

      await syncMetadata({ key, clientId });
      setImageClientId(clientId);
      toast.success('Image uploaded successfully');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      setImagePreview(null);
      setImageClientId(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageClientId(null); // Will signal image removal to backend
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      toast.error('Title and Text content are required');
      return;
    }

    setIsSaving(true);

    try {
      if (editingReply) {
        // Decide imageClientId value:
        // - undefined: no change
        // - null: removed image
        // - string: new image uploaded
        let nextImageClientId: string | null | undefined = undefined;
        if (imagePreview === null) {
          nextImageClientId = null;
        } else if (imageClientId !== null) {
          nextImageClientId = imageClientId;
        }

        await updateQuickReply({
          id: editingReply._id,
          title,
          text,
          imageClientId: nextImageClientId,
        });
        toast.success('Quick reply updated');
      } else {
        await createQuickReply({
          title,
          text,
          imageClientId: imageClientId ?? undefined,
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
    <div className="flex-1 space-y-6 p-8 overflow-y-auto max-h-[calc(100svh-6rem)] no-scrollbar bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Quick Replies</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pre-configure text and images for fast access and messaging workflows.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 shadow-sm">
          <Plus className="size-4" />
          New Reply
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center w-full max-w-md relative">
        <Search className="absolute left-3 size-4 text-muted-foreground" />
        <Input
          placeholder="Search replies by title or text..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 w-full rounded-lg bg-card shadow-sm border-border/80 focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Main List Grid */}
      {quickReplies === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-xl border border-border bg-card p-5 h-44 animate-pulse">
              <div className="h-5 w-1/3 bg-muted rounded mb-3" />
              <div className="h-4 w-5/6 bg-muted rounded mb-2" />
              <div className="h-4 w-4/6 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filteredReplies.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-16 rounded-xl border border-dashed border-border/60 bg-card/45 min-h-[300px]">
          <div className="rounded-full bg-muted/65 p-4 mb-4">
            <MessageSquare className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No quick replies found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            {searchQuery ? "Try refining your search query." : "Configure shortcuts for quick answers to customer messages."}
          </p>
          {!searchQuery && (
            <Button onClick={openCreateDialog} variant="outline" className="mt-4 gap-2">
              <Plus className="size-3.5" />
              Create the first reply
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {filteredReplies.map((reply) => (
            <div
              key={reply._id}
              className="group relative flex flex-col justify-between rounded-xl border border-border bg-card hover:bg-card/80 hover:shadow-md hover:border-border/100 transition-all duration-200 p-5 h-44"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-foreground text-base tracking-tight truncate flex-1">
                    {reply.title}
                  </h3>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-md hover:bg-muted"
                      onClick={() => openEditDialog(reply)}
                      title="Edit"
                    >
                      <Edit2 className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-md hover:bg-muted text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingReply(reply)}
                      title="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm font-normal line-clamp-3 leading-relaxed whitespace-pre-wrap">
                  {reply.text}
                </p>
              </div>

              {reply.imageUrl && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                  <div className="relative size-7 overflow-hidden rounded bg-muted border border-border/80 shrink-0">
                    <img src={reply.imageUrl} alt="" className="size-full object-cover" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="size-3" /> Image attachment configured
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !isSaving && !isUploading && setIsDialogOpen(open)}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card border border-border/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingReply ? 'Edit Quick Reply' : 'Add Quick Reply'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingReply
                ? 'Update title, message templates, or attachments for this quick reply.'
                : 'Create a new canned message shortcut for your teammates.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="reply-title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Title / Shortcut Name
              </label>
              <Input
                id="reply-title"
                placeholder="e.g. Greeting, pricing_list"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving || isUploading}
                maxLength={80}
                required
                className="bg-background border-border/85"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reply-text" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Template Message Content
              </label>
              <Textarea
                id="reply-text"
                placeholder="Enter the template response text that will render in the message draft input..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isSaving || isUploading}
                rows={4}
                required
                className="bg-background border-border/85 min-h-[100px] leading-relaxed resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Image Attachment (Optional)
              </span>

              {imagePreview ? (
                <div className="relative group/img size-32 overflow-hidden rounded-xl border border-border bg-muted">
                  <img src={imagePreview} alt="Upload preview" className="size-full object-cover" />
                  {!isSaving && !isUploading && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 rounded-full bg-black/60 hover:bg-black/85 p-1 text-white shadow-sm transition-colors"
                      aria-label="Remove image"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 p-6 text-center hover:border-muted-foreground/35 transition-colors bg-background/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSaving || isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Upload image"
                  />
                  <Upload className="size-6 text-muted-foreground mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    Upload shortcut image
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Click or drag image here
                  </p>
                </div>
              )}

              {isUploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1.5">
                      <Spinner className="size-3" /> Uploading image to R2...
                    </span>
                    <span className="tabular-nums">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress ?? 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-border/40 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving || isUploading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isUploading || !title.trim() || !text.trim()}
                className="w-full sm:w-auto gap-2"
              >
                {isSaving ? (
                  <>
                    <Spinner className="size-3.5" />
                    Saving…
                  </>
                ) : (
                  'Save reply'
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
              variant="outline"
              onClick={() => setDeletingReply(null)}
              disabled={isDeleting}
              className="w-full sm:w-auto"
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
