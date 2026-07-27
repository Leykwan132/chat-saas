/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import {
  isWhatsAppErrorMessage,
  logWhatsAppLiveErrorMessage,
} from "./whatsappHistoryDiagnostics";

const modules = import.meta.glob("./**/*.ts");

test("live ingest logs Meta error details for error-typed messages", () => {
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    const message = {
      id: "wamid.error",
      from: "16505551234",
      timestamp: "1700000",
      type: "error",
      errors: [{ code: 131026, title: "Message undeliverable" }],
    };
    expect(isWhatsAppErrorMessage(message)).toBe(true);
    logWhatsAppLiveErrorMessage({
      source: "messages",
      phoneNumberId: "phone-123",
      message,
    });
    expect(errorLog).toHaveBeenCalledWith(
      "[whatsapp] live ingest Meta error message",
      expect.objectContaining({
        source: "messages",
        phoneNumberId: "phone-123",
        externalId: "wamid.error",
        type: "error",
        errors: [{ code: 131026, title: "Message undeliverable" }],
      }),
    );
  } finally {
    errorLog.mockRestore();
  }
});

test("history staging logs Meta error details before saving the placeholder", async () => {
  const t = convexTest(schema, modules);
  const channelId = await t.run(async (ctx) =>
    ctx.db.insert("channels", {
      orgId: "org-123",
      service: "whatsapp",
      wabaId: "waba-123",
      phoneNumberId: "phone-123",
      accessToken: "token-123",
      status: "connected",
      connectedByUserId: "user-123",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    }),
  );
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

  try {
    await t.mutation(internal.whatsappSync.internalStageHistoryBatch, {
      channelId,
      phoneNumberId: "phone-123",
      phase: 0,
      chunkOrder: 1,
      progress: 10,
      historyThreads: [
        {
          id: "16505551234",
          messages: [
            {
              id: "msg-error",
              from: "16505551234",
              timestamp: "1700000",
              type: "error",
              errors: [
                {
                  code: 131026,
                  title: "Message undeliverable",
                  message: "Unable to deliver message",
                  error_data: { details: "Meta diagnostic details" },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(errorLog).toHaveBeenCalledWith(
      "[whatsapp-history] staging Meta error message",
      expect.objectContaining({
        channelId,
        externalId: "msg-error",
        whatsappThreadId: "16505551234",
        type: "error",
        timestamp: "1700000",
        errors: [
          {
            code: 131026,
            title: "Message undeliverable",
            message: "Unable to deliver message",
            error_data: { details: "Meta diagnostic details" },
          },
        ],
        payloadKeys: ["errors", "from", "id", "timestamp", "type"],
      }),
    );
  } finally {
    errorLog.mockRestore();
  }

  const staged = await t.run(async (ctx) =>
    ctx.db.query("whatsappHistoryIngestMessages").first(),
  );
  expect(staged?.content).toBe("<error>");
});
