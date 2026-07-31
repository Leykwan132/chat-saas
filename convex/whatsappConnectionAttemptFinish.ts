import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import { isOpenWhatsAppConnectionAttempt } from "./whatsappConnectionAttemptUtils";

type RecordSignupFinishedArgs = {
  attemptId: Id<"whatsappConnectionAttempts">;
  wabaId: string;
  phoneNumberId: string;
};

export async function recordWhatsAppSignupFinished(
  ctx: MutationCtx,
  args: RecordSignupFinishedArgs,
) {
  const { userId } = await getAuthContext(ctx);
  const attempt = await ctx.db.get(args.attemptId);
  if (attempt === null) {
    throw new Error("Connection attempt not found.");
  }
  if (attempt.connectedByUserId !== userId) {
    throw new Error("Not allowed to update this connection attempt.");
  }

  const wabaId = args.wabaId.trim();
  const phoneNumberId = args.phoneNumberId.trim();
  if (!wabaId || !phoneNumberId) {
    throw new Error("WhatsApp signup did not return the required account IDs.");
  }
  if (
    (attempt.wabaId !== undefined && attempt.wabaId !== wabaId) ||
    (attempt.phoneNumberId !== undefined &&
      attempt.phoneNumberId !== phoneNumberId)
  ) {
    throw new Error("WhatsApp signup returned IDs for a different connection attempt.");
  }
  if (attempt.signupFinishedAt !== undefined) {
    return null;
  }
  if (!isOpenWhatsAppConnectionAttempt(attempt)) {
    throw new Error("This connection attempt is no longer active.");
  }

  const now = Date.now();
  await ctx.db.patch(args.attemptId, {
    wabaId,
    phoneNumberId,
    signupFinishedAt: now,
    status: attempt.status === "started" ? "signup_finished" : attempt.status,
    updatedAt: now,
  });
  return null;
}
