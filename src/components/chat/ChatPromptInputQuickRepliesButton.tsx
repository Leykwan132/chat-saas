import { useState, type RefObject } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ReplyAll,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';
import {
  useOptionalPromptInputController,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

export type ChatPromptInputQuickRepliesButtonProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  resizeTextarea: (element: HTMLTextAreaElement) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function ChatPromptInputQuickRepliesButton({
  disabled,
  onChange,
  resizeTextarea,
  textareaRef,
}: ChatPromptInputQuickRepliesButtonProps) {
  const { agentId } = useParams();
  const quickRepliesList = useQuery(api.quickReplies.list);
  const attachments = usePromptInputAttachments();
  const controller = useOptionalPromptInputController();
  const [open, setOpen] = useState(false);

  const handleSelectQuickReply = (reply: Doc<'quickReplies'>) => {
    attachments.clear();

    if (textareaRef.current) {
      textareaRef.current.value = reply.text;
      resizeTextarea(textareaRef.current);
      textareaRef.current.focus();
    }

    controller?.textInput.setInput(reply.text);
    onChange(reply.text);
    setOpen(false);

    reply.imageUrls?.forEach((url, index) => {
      attachments.addUrl(
        url,
        `quick_reply_image_${index + 1}.png`,
        'image/png',
      );
    });
  };

  if (quickRepliesList === undefined) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          variant="ghost"
          size="sm"
          className="flex h-8 items-center gap-1.5 border-none bg-transparent px-2 text-muted-foreground shadow-none hover:bg-muted/50 hover:text-foreground"
        >
          <ReplyAll className="size-3.5" />
          <span className="text-xs font-semibold">Quick replies</span>
          {open ? (
            <ChevronDown className="ml-0.5 size-3.5 opacity-60" />
          ) : (
            <ChevronUp className="ml-0.5 size-3.5 opacity-60" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-50 flex w-80 flex-col gap-1.5 rounded-xl border border-border bg-popover px-2 py-0 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border/40 px-1 pb-1 pt-2">
          <span className="text-xs font-medium text-muted-foreground">
            Quick replies
          </span>
          <Link
            to={`/dashboard/${agentId}/quick-replies`}
            onClick={() => setOpen(false)}
            className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-500"
          >
            Edit
          </Link>
        </div>
        <div className="no-scrollbar flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {quickRepliesList.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs font-medium text-muted-foreground">
              No quick replies set yet.
            </div>
          ) : (
            quickRepliesList.map((reply, index) => (
              <div key={reply._id} className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleSelectQuickReply(reply)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-all hover:bg-muted/60 focus:outline-none active:scale-[0.99]"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {reply.title}
                    </span>
                    <span className="mt-0.5 flex w-full items-center gap-1.5 truncate text-[11px] leading-relaxed text-muted-foreground">
                      {reply.imageUrls && reply.imageUrls.length > 0 ? (
                        <ImageIcon className="size-3 shrink-0 text-muted-foreground/80" />
                      ) : null}
                      <span className="flex-1 truncate">{reply.text}</span>
                    </span>
                  </div>
                  {reply.imageUrls && reply.imageUrls.length > 0 ? (
                    <div className="relative flex shrink-0 items-center justify-center">
                      <AvatarGroup className="-space-x-1.5">
                        {reply.imageUrls.map((url, imageIndex) => (
                          <Avatar
                            key={`${url}-${imageIndex}`}
                            size="sm"
                            className="size-6 border border-background"
                          >
                            <AvatarImage src={url} alt="" />
                            <AvatarFallback className="bg-muted text-[8px] font-semibold">
                              QR
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </AvatarGroup>
                    </div>
                  ) : null}
                </button>
                {index < quickRepliesList.length - 1 ? (
                  <Separator className="my-0.5 shrink-0 bg-border/30" />
                ) : null}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
