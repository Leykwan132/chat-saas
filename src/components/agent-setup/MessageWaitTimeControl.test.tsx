import { renderToStaticMarkup } from "react-dom/server";
import { getFunctionName } from "convex/server";
import { expect, test, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { AgentSetupRoutingPanel } from "./AgentSetupRoutingPanel";
import { MessageWaitTimeControl } from "./MessageWaitTimeControl";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => {
    mocks.query(getFunctionName(reference));
    return getFunctionName(reference) === "messageWaitSettings:get" ? 5 : null;
  },
}));
const agentId = "agent" as Id<"agents">;
const props = {
  agentId,
  canReadRouting: true,
  canManageRouting: true,
  isLoading: false,
  isPublishing: false,
  replyMode: "automatic" as const,
  replyAudience: "all" as const,
  onReplyAudienceChange: vi.fn(),
  onReplyModeChange: vi.fn(),
};

test("message wait appears within AI Replies with the product default and explicit save", () => {
  const html = renderToStaticMarkup(<AgentSetupRoutingPanel {...props} />);
  expect(html.indexOf("Message wait time (seconds)")).toBeGreaterThan(
    html.indexOf("AI Replies"),
  );
  expect(html).toContain('value="5"');
  expect(html).toContain("0 for immediate replies");
  expect(html).toContain("Save message wait time");
});

test.each([{ canManageRouting: false }, { isPublishing: true }])(
  "disables message wait edits %j",
  (state) => {
    const html = renderToStaticMarkup(
      <AgentSetupRoutingPanel {...props} {...state} />,
    );
    expect(html).toMatch(/<input[^>]*disabled=""[^>]*value="5"/);
  },
);

test("does not query message wait without read permission", () => {
  mocks.query.mockClear();
  const html = renderToStaticMarkup(
    <AgentSetupRoutingPanel {...props} canReadRouting={false} />,
  );
  expect(html).not.toContain("Message wait time");
  expect(mocks.query).not.toHaveBeenCalled();
});

test("renders saved zero without replacing it with the default", () => {
  const html = renderToStaticMarkup(
    <MessageWaitTimeControl agentId={agentId} messageWaitSeconds={0} />,
  );
  expect(html).toContain('value="0"');
  expect(html).toContain('min="0"');
  expect(html).toContain('max="60"');
});
