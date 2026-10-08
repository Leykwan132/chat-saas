import { Camera, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import type { QuickRepliesEditor } from './useQuickRepliesEditor';

export function QuickReplyEditorDialog({ editor }: { editor: QuickRepliesEditor }) {
  const { isDialogOpen, isSaving, isCurrentlyUploading, setIsDialogOpen, editingReply,
    canManage, setDeletingReply, title, setTitle, text, setText, attachments,
    handleSave, handleFilesChange, handleRemoveAttachment } = editor;
  return (
      <Dialog open={isDialogOpen} onOpenChange={(open) => !isSaving && !isCurrentlyUploading && setIsDialogOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReply ? 'Edit quick reply' : 'New quick reply'}
            </DialogTitle>
            <DialogDescription>Save a reusable response for your team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-6">
            <Field>
              <FieldLabel htmlFor="reply-title">
                Shortcut
              </FieldLabel>
              <Input
                id="reply-title"
                placeholder="e.g. greeting, pricing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving || isCurrentlyUploading}
                maxLength={80}
                required

              />
            </Field>

            <Field>
              <FieldLabel htmlFor="reply-text">
                Message
              </FieldLabel>
              <Textarea
                id="reply-text"
                placeholder="Enter the template response text that will render in the message draft input..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isSaving || isCurrentlyUploading}
                rows={4}
                required
                className="min-h-24 resize-y"
              />
            </Field>

            <div className="flex flex-col gap-2">
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

            <DialogFooter className="flex-row items-center">
              {editingReply && canManage && (
                <Button type="button" variant="destructiveGhost" size="icon" className="mr-auto" aria-label="Delete quick reply" disabled={isSaving || isCurrentlyUploading} onClick={() => setDeletingReply(editingReply)}>
                  <Trash2 />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving || isCurrentlyUploading}

              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isCurrentlyUploading || !title.trim() || !text.trim()}

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

  );
}
