import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { InboxUIMessage } from "@/lib/inboxOptimistic";
import { InboxMessageBody } from "./InboxMessageBody";

function renderMessage(overrides: Partial<InboxUIMessage> = {}) {
  const message = {
    key: "reply",
    role: "assistant",
    text: "Hello",
    parts: [],
    ...overrides,
  } as InboxUIMessage;
  return renderToStaticMarkup(
    <InboxMessageBody
      message={message}
      isCustomer={message.role === "user"}
      isPending={false}
    />,
  );
}

test("AI replies use strong purple in light and dark themes", () => {
  const markup = renderMessage({ sentByAi: true });
  expect(markup).toContain("bg-violet-600");
  expect(markup).toContain("dark:bg-violet-700");
  expect(markup).toContain("text-white");
  expect(markup).toContain("dark:text-white");
  expect(markup).not.toContain("bg-blue-50");
});

test("human replies retain blue even when AI metadata is absent", () => {
  for (const sentByAi of [false, undefined]) {
    expect(renderMessage({ sentByAi })).toContain("bg-blue-50");
  }
});

test("customer, deleted and workflow presentations retain their own styles", () => {
  expect(renderMessage({ role: "user", sentByAi: true })).toContain("bg-card");
  const deleted = renderMessage({ sentByAi: true, revokedAt: 1 });
  expect(deleted).toContain("This message was deleted");
  expect(deleted).not.toContain("bg-violet-600");
  const workflow = renderMessage({
    sentByAi: true,
    workflowAutomationSource: "workflowFollowUp",
  });
  expect(workflow).not.toContain("bg-violet-600");
});
