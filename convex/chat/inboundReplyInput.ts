import {
  docsToModelMessages,
  filterOutOrphanedToolMessages,
} from "@convex-dev/agent";
import type { ContextHandler } from "@convex-dev/agent";
import type { ModelMessage } from "ai";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { components, internal } from "../_generated/api";
import { instructionContextHistory } from "./instructionContext";

export type GroupedReplyInput = {
  sourcePromptMessageId: string;
  latestPromptMessageId: string;
  messages: ModelMessage[];
  history: ModelMessage[];
  decisionState: string;
};

export async function loadGroupedReplyInput(
  ctx: Pick<ActionCtx, "runQuery">,
  runId: Id<"inboundReplyRuns">,
  threadId: string,
  instructionsUpdatedAt?: number,
): Promise<GroupedReplyInput | null> {
  const input = await ctx.runQuery(internal.inboundReplyRuns.getInput, {
    runId,
  });
  if (!input) return null;
  if (input.promptMessageIds.length === 0)
    throw new Error("Reply group has no pending input");
  const docs = await ctx.runQuery(components.agent.messages.getMessagesByIds, {
    messageIds: input.promptMessageIds,
  });
  const originals = docs.map((doc) => {
    if (
      !doc ||
      doc.threadId !== threadId ||
      doc.message?.role !== "user" ||
      doc.status !== "success"
    )
      throw new Error("Grouped customer message is missing or not ready");
    return doc;
  });
  const first = originals[0];
  const historyPage = await ctx.runQuery(
    components.agent.messages.listMessagesByThreadId,
    {
      threadId,
      order: "desc",
      statuses: ["success"],
      paginationOpts: { numItems: 101, cursor: null },
      upToAndIncludingMessageId: input.promptMessageIds[0],
    },
  );
  const previous = historyPage.page
    .filter((doc) => doc.order < first.order)
    .reverse();
  const pendingIds = new Set(input.promptMessageIds);
  const messages = docsToModelMessages(originals);
  const history = docsToModelMessages(
    filterOutOrphanedToolMessages(
      instructionContextHistory(
        previous.filter((doc) => !pendingIds.has(doc._id)),
        instructionsUpdatedAt,
      ),
    ),
  );
  const decisionState = [...history, ...messages]
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .map((message) => {
      const content =
        typeof message.content === "string"
          ? message.content
          : message.content
              .flatMap((part) => (part.type === "text" ? [part.text] : []))
              .join("\n");
      return `${message.role === "user" ? "Customer" : "Assistant"}: ${content}`;
    })
    .join("\n");
  return {
    sourcePromptMessageId: input.promptMessageIds[0],
    latestPromptMessageId:
      input.promptMessageIds[input.promptMessageIds.length - 1],
    messages,
    history,
    decisionState,
  };
}

export function groupedReplyContext(input: GroupedReplyInput) {
  const contextHandler: ContextHandler = (_ctx, args) => [
    ...input.history,
    ...args.inputMessages,
    ...args.inputPrompt,
    ...args.existingResponses,
  ];
  return { contextOptions: { recentMessages: 0 }, contextHandler };
}
