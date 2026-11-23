import { useState } from "react";
import { cn } from "@/lib/utils";
import { RotateCw, Maximize2 } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Conversation } from "@/components/ai-elements/conversation";
import { ChatPromptInput } from "@/components/ChatPromptInput";
import { PlaygroundAssistantResponseDialog } from "./PlaygroundAssistantResponseDialog";
import {
  PlaygroundMessageAttachments,
  PLAYGROUND_PROMPT_SHELL_CLASS,
  type ExpandedAssistantResponse,
} from "./playgroundPresentation";
import { StreamingMarkdown } from "./PlaygroundStreamingMarkdown";
import { LoadMoreMessagesOnScroll } from "./LoadMorePlaygroundMessages";
import { PlaygroundThreadMessages } from "./PlaygroundThreadMessages";
import { usePlaygroundChat } from "./usePlaygroundChat";

export function TestChatWindow({
  agentId,
  threadId,
  agentName,
  embedded = false,
  fillContainer = false,
  onThreadIdChange,
}: {
  agentId: Id<"agents">;
  threadId: string | undefined;
  agentName?: string;
  embedded?: boolean;
  fillContainer?: boolean;
  onThreadIdChange?: (threadId: string) => void;
}) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const {
    input,
    setInput,
    isSending,
    resetDialogOpen,
    setResetDialogOpen,
    inputRef,
    messages,
    status,
    loadMore,
    mediaByClientId,
    handleSubmit,
    handleReset,
    handleResetConfirm,
  } = usePlaygroundChat({ agentId, threadId, onThreadIdChange });
  const [expandedResponse, setExpandedResponse] =
    useState<ExpandedAssistantResponse | null>(null);
  const isConversationLoading = !threadId || status === "LoadingFirstPage";
  const displayName = agentName?.trim() || "your agent";

  const renderInput = (ref: React.RefObject<HTMLTextAreaElement | null>) => (
    <div className="w-full min-w-0 max-w-full shrink-0 overflow-hidden border-t border-border p-4">
      <div className={PLAYGROUND_PROMPT_SHELL_CLASS}>
        <ChatPromptInput
          containerClassName="w-full max-w-full"
          disabled={isSending}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type a message..."
          submitDisabled={isSending}
          submitStatus={isSending ? "submitted" : undefined}
          textareaRef={ref}
          value={input}
          allowImageAttachments
          enableMediaUpload
        />
      </div>
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 w-full min-w-0 max-w-full flex-col",
          fillContainer && "h-full",
        )}
      >
        <div
          className={cn(
            "flex w-full min-w-0 max-w-full flex-col overflow-hidden",
            !fillContainer &&
              "rounded-lg border border-border bg-card shadow-sm",
            fillContainer
              ? "mt-0 min-h-0 flex-1 bg-card"
              : embedded
                ? "h-[min(744px,calc(100vh-10rem))] min-h-[541px]"
                : "mt-4 h-[calc(100vh-220px)] min-h-[600px]",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold truncate max-w-[150px] sm:max-w-[280px]">
              {agentName?.trim() || "Test your agent"}
            </span>

            <div className="flex items-center gap-1">
              {embedded ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setFullscreenOpen(true)}
                  title="Open full playground"
                  aria-label="Open full playground"
                >
                  <Maximize2 className="size-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleReset}
                disabled={!threadId}
                title="Reset conversation"
              >
                <RotateCw className="size-4" />
              </Button>
            </div>
          </div>

          <Conversation className="h-0 min-h-0 min-w-0 flex-1 overflow-hidden">
            <LoadMoreMessagesOnScroll loadMore={loadMore} status={status} />
            <PlaygroundThreadMessages
              isConversationLoading={isConversationLoading}
              displayName={displayName}
              messages={messages}
              status={status}
              mediaByClientId={mediaByClientId}
              setExpandedResponse={setExpandedResponse}
            />
          </Conversation>

          {renderInput(inputRef)}
        </div>
      </div>

      <PlaygroundAssistantResponseDialog
        onOpenChange={(open) => {
          if (!open) setExpandedResponse(null);
        }}
        open={expandedResponse !== null}
        title={`${displayName} response`}
      >
        <div className="space-y-3">
          {expandedResponse?.textParts.map((text, index) => (
            <StreamingMarkdown
              key={`${expandedResponse.key}-expanded-part-${index}`}
              status={expandedResponse.status}
              text={text}
            />
          ))}
          {expandedResponse ? (
            <PlaygroundMessageAttachments
              items={expandedResponse.mediaItems}
              messageKey={expandedResponse.key}
            />
          ) : null}
        </div>
      </PlaygroundAssistantResponseDialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset conversation</DialogTitle>
            <DialogDescription>
              This will delete all messages and start a fresh thread.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleResetConfirm()}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {embedded ? (
        <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
          <DialogContent className="flex h-[min(92vh,960px)] w-full max-w-[min(calc(100%-2rem),70rem)] flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card p-0 shadow-sm sm:max-w-[min(calc(100%-2rem),70rem)]">
            <DialogHeader className="sr-only">
              <DialogTitle>Playground</DialogTitle>
              <DialogDescription>
                Test your agent in an expanded window
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-hidden">
              <TestChatWindow
                agentId={agentId}
                agentName={agentName}
                threadId={threadId}
                fillContainer
                onThreadIdChange={onThreadIdChange}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
