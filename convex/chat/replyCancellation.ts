export class ReplySupersededError extends Error {
  constructor() {
    super("Reply generation was superseded");
    this.name = "ReplySupersededError";
  }
}

export function handleReplyGenerationError(
  error: unknown,
  details: { conversationId: string; runId: string | undefined },
) {
  if (!(error instanceof ReplySupersededError)) throw error;
  console.info("[inbox] reply generation cancelled", details);
}
