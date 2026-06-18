"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Bot, format, bold, italic } from "gramio";
import { buildContactRequestSummary } from "./contactAdmin";

function getBotToken(): string | null {
  return process.env.BOT_TOKEN?.trim() || null;
}

function getAdminTelegramChatId(): string | null {
  return process.env.ADMIN_TELEGRAM_CHAT_ID?.trim() || null;
}

export const sendNewRequestAlert = internalAction({
  args: {
    requestId: v.id("contactRequests"),
  },
  handler: async (ctx, args) => {
    const botToken = getBotToken();
    const chatId = getAdminTelegramChatId();

    if (!botToken || !chatId) {
      console.warn(
        "Skipping contact request Telegram alert: BOT_TOKEN or ADMIN_TELEGRAM_CHAT_ID is not configured",
      );
      return { ok: false, skipped: true };
    }

    const request = await ctx.runQuery(internal.contactAdmin.getRequestForNotify, {
      requestId: args.requestId,
    });

    if (!request) {
      console.warn("Skipping contact request Telegram alert: request not found", args.requestId);
      return { ok: false, skipped: true };
    }

    const summary = buildContactRequestSummary(request);
    const receivedAt = new Date(request.createdAt).toISOString();

    const detailsBlock = summary.lines.join("\n");

    const text = format`
${bold`New contact request`}

Intent: ${italic`${summary.intentLabel}`}
Received: ${receivedAt}

${detailsBlock}
`;

    try {
      const bot = new Bot(botToken);
      await bot.api.sendMessage({
        chat_id: chatId,
        text,
      });
      return { ok: true };
    } catch (error) {
      console.error("Failed to send contact request Telegram alert", error);
      return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
