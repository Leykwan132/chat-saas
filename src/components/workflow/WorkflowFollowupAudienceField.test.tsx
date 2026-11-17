import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { WorkflowFollowupAudienceField } from "./WorkflowFollowupAudienceField";

let dataMode = "authenticated";
let agentId: string | undefined = "agent";
const queries: Array<{ name: string; args: unknown }> = [];

vi.mock("react-router", () => ({ useParams: () => ({ agentId }) }));
vi.mock("./workflowAutomationContext", () => ({
  useWorkflowAutomationState: () => ({
    dataMode,
    followupAudienceFilters: ["tag:VIP", "tag:客户", "lead:Hot"],
    setFollowupAudienceFilters: vi.fn(),
  }),
}));
vi.mock("convex/react", () => ({
  useQuery: (
    reference: Parameters<typeof getFunctionName>[0],
    args: unknown,
  ) => {
    const name = getFunctionName(reference);
    queries.push({ name, args });
    if (args === "skip") return undefined;
    if (name !== "customerTags:listForCurrentOrg")
      throw new Error("Audience selection must not load customer records");
    return ["VIP", "客户"];
  },
}));

beforeEach(() => {
  dataMode = "authenticated";
  agentId = "agent";
  queries.length = 0;
});

test("audience displays workspace tags and lead temperatures without loading customers", () => {
  const html = renderToStaticMarkup(<WorkflowFollowupAudienceField />);
  expect(html).toContain("VIP");
  expect(html).toContain("客户");
  expect(html).toContain("Hot");
  expect(html).not.toContain("tag:VIP");
  expect(queries).toEqual([
    { name: "customerTags:listForCurrentOrg", args: {} },
  ]);
});

test.each(["local", "missing-agent"])(
  "audience skips data access for %s canvas",
  (scenario) => {
    if (scenario === "local") dataMode = "local";
    if (scenario === "missing-agent") agentId = undefined;
    renderToStaticMarkup(<WorkflowFollowupAudienceField />);
    expect(queries[0]?.args).toBe("skip");
  },
);
