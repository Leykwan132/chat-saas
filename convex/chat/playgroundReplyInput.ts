import {
  docsToModelMessages,
  filterOutOrphanedToolMessages,
  type ContextHandler,
} from "@convex-dev/agent";
import type { ActionCtx } from "../_generated/server";
import { components } from "../_generated/api";
import { instructionContextHistory } from "./instructionContext";

export async function loadPlaygroundReplyInput(
  ctx: Pick<ActionCtx, "runQuery">,
  args: {
    threadId: string;
    firstPromptMessageId: string;
    promptMessageId: string;
  },
  instructionsUpdatedAt?: number,
) {
  const [first, latest] = await ctx.runQuery(
    components.agent.messages.getMessagesByIds,
    {
      messageIds: [args.firstPromptMessageId, args.promptMessageId],
    },
  );
  if (
    !first ||
    !latest ||
    first.threadId !== args.threadId ||
    latest.threadId !== args.threadId
  ) {
    throw new Error("Playground reply messages are unavailable");
  }
  const page = await ctx.runQuery(
    components.agent.messages.listMessagesByThreadId,
    {
      threadId: args.threadId,
      order: "desc",
      statuses: ["success"],
      upToAndIncludingMessageId: args.promptMessageId,
      paginationOpts: { numItems: 1000, cursor: null },
    },
  );
  const ordered = [...page.page].reverse();
  if (!ordered.some((message) => message._id === first._id)) {
    throw new Error("Playground message group exceeds the context limit");
  }
  const pending = ordered.filter(
    (message) =>
      message.order >= first.order && message.message?.role === "user",
  );
  if (!pending.length) throw new Error("Playground reply group is empty");
  const prompt = [
    "The customer sent the following messages together while waiting for your reply, in chronological order.",
    "Answer every unanswered question in this group. A closing thanks or greeting does not cancel an earlier question.",
    ...pending.map((message, index) => `${index + 1}. ${message.text}`),
  ].join("\n\n");
  const history = docsToModelMessages(
    filterOutOrphanedToolMessages(
      instructionContextHistory(
        ordered.filter((message) => message.order < first.order),
        instructionsUpdatedAt,
      ),
    ),
  );
  const contextHandler: ContextHandler = (_ctx, input) => [
    ...history,
    ...input.inputMessages.filter((message) => message.role === "system"),
    { role: "user", content: prompt },
    ...input.existingResponses,
  ];
  return {
    contextHandler,
    decisionState: `${history.map((message) => `${message.role}: ${JSON.stringify(message.content)}`).join("\n")}\nCustomer message group:\n${prompt}`,
  };
}
