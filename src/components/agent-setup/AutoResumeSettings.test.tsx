import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { AgentSetupRoutingPanel } from "./AgentSetupRoutingPanel";
import { HumanEscalationRules } from "./HumanEscalationRules";
import { getFunctionName } from "convex/server";
import type { Id } from "../../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: (
    reference: Parameters<typeof getFunctionName>[0],
    args: { scope?: string },
  ) => {
    if (getFunctionName(reference) !== "autoDeescalationConfig:get")
      return null;
    return {
      enabled: true,
      inactivityMinutes: args.scope === "normal" ? 5 : 30,
      keywords: [],
      revision: 1,
      activationRevision: 1,
    };
  },
}));

const props = {
  agentId: "agent" as Id<"agents">,
  canReadRouting: true,
  canManageRouting: true,
  isLoading: false,
  isPublishing: false,
  replyMode: "automatic" as const,
  replyAudience: "all" as const,
  onReplyAudienceChange: vi.fn(),
  onReplyModeChange: vi.fn(),
};

test("AI Replies shows independent normal auto resume after its audience controls", () => {
  const html = renderToStaticMarkup(<AgentSetupRoutingPanel {...props} />);
  expect(html).toContain("Auto resume");
  expect(html).not.toContain("Message wait time");
  expect(html).toContain('value="5"');
  expect(html.indexOf("Auto resume")).toBeGreaterThan(
    html.indexOf("Who should AI reply to?"),
  );
  expect(html).toContain(
    "For normal conversations after your team replies. Escalated chats use Human Escalation settings.",
  );
  expect(html).not.toContain("Auto Resolve Keyword Triggers");
  const escalation = renderToStaticMarkup(
    <HumanEscalationRules
      agentId={props.agentId}
      graph={{ nodes: [], edges: [] }}
      disabled={false}
    />,
  );
  expect(escalation).toContain("Auto Resolve");
  expect(escalation).toContain('value="30"');
  expect(escalation).not.toContain("For normal conversations");
});

test("normal auto resume cannot be edited without manage permission", () => {
  const html = renderToStaticMarkup(
    <AgentSetupRoutingPanel {...props} canManageRouting={false} />,
  );
  expect(html).toContain('id="auto-resume-agent"');
  expect(html).toMatch(
    /<button[^>]*id="auto-resume-agent"[^>]*disabled=""|<button[^>]*disabled=""[^>]*id="auto-resume-agent"/,
  );
});

test("AI Replies hides all settings without read permission", () => {
  const html = renderToStaticMarkup(
    <AgentSetupRoutingPanel {...props} canReadRouting={false} />,
  );
  expect(html).not.toContain("Auto resume");
});
