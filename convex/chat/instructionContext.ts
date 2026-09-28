import {
  docsToModelMessages,
  filterOutOrphanedToolMessages,
  listMessages,
  sorted,
  type ContextHandler,
} from "@convex-dev/agent";
import { components } from "../_generated/api";

const MODEL_CONTEXT_MESSAGE_COUNT = 100;

export type InstructionContextDoc = {
  _id: string;
  _creationTime: number;
  message?: { role: string };
};

export function instructionContextHistory<T extends InstructionContextDoc>(
  docsAscending: T[],
  instructionsUpdatedAt: number,
  promptMessageId?: string,
): T[] {
  const promptIndex =
    promptMessageId === undefined
      ? -1
      : docsAscending.findIndex((doc) => doc._id === promptMessageId);
  const history =
    promptIndex === -1 ? docsAscending : docsAscending.slice(0, promptIndex);
  return history.filter((doc) => {
    if (doc._creationTime >= instructionsUpdatedAt) return true;
    return doc.message?.role === "user";
  });
}

export function createInstructionContextHandler(args: {
  instructionsUpdatedAt: number | undefined;
  promptMessageId: string | undefined;
}): ContextHandler {
  return async (ctx, handlerArgs) => {
    if (
      args.instructionsUpdatedAt === undefined ||
      handlerArgs.threadId === undefined
    ) {
      return handlerArgs.allMessages;
    }
    const { page } = await listMessages(ctx, components.agent, {
      threadId: handlerArgs.threadId,
      paginationOpts: {
        numItems: MODEL_CONTEXT_MESSAGE_COUNT,
        cursor: null,
      },
      statuses: ["success"],
    });
    const history = filterOutOrphanedToolMessages(
      instructionContextHistory(
        sorted(page),
        args.instructionsUpdatedAt,
        args.promptMessageId,
      ),
    );
    return [
      ...docsToModelMessages(history),
      ...handlerArgs.inputMessages,
      ...handlerArgs.inputPrompt,
      ...handlerArgs.existingResponses,
    ];
  };
}
