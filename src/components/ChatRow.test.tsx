import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { ChatRow, type Chat } from "./ChatRow";
import type { Id } from "../../convex/_generated/dataModel";

const chat: Chat = {
  id: "chat" as Id<"conversations">,
  name: "Customer",
  message: "A readable message preview",
  time: "Now",
  unread: 1,
  platform: "web",
  requiresAction: true,
  conversationStatus: "open",
};
function render(comfortable: boolean) {
  return renderToStaticMarkup(
    <ChatRow
      chat={chat}
      comfortable={comfortable}
      index={0}
      total={1}
      isSelected={false}
      isPinned={false}
      onSelect={vi.fn()}
      onTogglePin={vi.fn()}
    />,
  );
}
test("focused chat rows have larger names, previews and vertical spacing", () => {
  const markup = render(true);
  expect(markup).toContain("font-size:15px");
  expect(markup).toContain("font-size:14px");
  expect(markup).toContain("line-height:20px");
  expect(markup).toContain("padding:18px 16px");
});
test("normal Inbox row density stays unchanged", () => {
  const markup = render(false);
  expect(markup).toContain("font-size:12px");
  expect(markup).toContain("padding:12px 16px");
});

test("shows the last reply author independently of the latest message sender", () => {
  chat.lastReplyAuthor = { kind: "ai", name: "AI" };
  chat.lastMessageSentByAi = false;
  expect(render(false)).toContain("Last reply by AI");
  chat.lastReplyAuthor = { kind: "human", name: "Alex" };
  expect(render(false)).toContain("Last reply by Alex");
  chat.lastReplyAuthor = null;
  expect(render(false)).not.toContain("Last reply by");
});
