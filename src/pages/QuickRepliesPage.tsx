import { ReplyAll, Plus, Search, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from '@/components/ui/avatar';
import { useQuickRepliesEditor } from '@/components/quick-replies/useQuickRepliesEditor';
import { QuickReplyEditorDialog } from '@/components/quick-replies/QuickReplyEditorDialog';
import { QuickReplyDeleteDialog } from '@/components/quick-replies/QuickReplyDeleteDialog';

export default function QuickRepliesPage() {
  const editor = useQuickRepliesEditor();
  const { quickReplies, canManage, searchQuery, setSearchQuery, filteredReplies,
    openCreateDialog, openEditDialog } = editor;
  return (
    <div className="flex w-full flex-col gap-6 max-w-none">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">Quick Replies</h1>
          <p className="text-sm text-muted-foreground">
            Save reusable responses for your team to quickly add to customer messages.
          </p>
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

      <div className="flex items-center w-full max-w-md relative">
        <Search className="absolute left-3 size-4 text-muted-foreground" />
        <Input
          placeholder="Search replies by title or text..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 w-full rounded-lg bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

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
            <button
              type="button"
              disabled={!canManage}
              onClick={() => openEditDialog(reply)}
              key={reply._id}
              className="group relative flex items-center justify-between gap-3 rounded-xl border border-border bg-card hover:bg-card/80 hover:border-border/100 transition-all duration-200 p-3 h-fit text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-sm tracking-tight truncate">
                    {reply.title}
                  </h3>

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
            </button>
          ))}
        </div>
      )}
      <QuickReplyEditorDialog editor={editor} />
      <QuickReplyDeleteDialog editor={editor} />
    </div>
  );
}
