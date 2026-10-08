import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { WorkflowNodeEscalationKeywordsControl } from "./WorkflowNodeEscalationKeywordsControl";

vi.mock("convex/react", () => ({ useMutation: () => async () => null }));

test("keywords appear only when detection is enabled", () => {
  const props = { agentId: "agent" as Id<"agents">, nodeId: "node" as Id<"workflowNodes">, keywords: ["human", "refund"], disabled: false };
  const enabled = renderToStaticMarkup(<WorkflowNodeEscalationKeywordsControl {...props} enabled />);
  expect(enabled).toContain("Keyword detection");
  expect(enabled).toContain("human");
  expect(enabled).toContain("Remove keyword human");
  expect(enabled).toContain("Add keyword");
  expect(renderToStaticMarkup(<WorkflowNodeEscalationKeywordsControl {...props} enabled={false} />)).not.toContain("Add keyword");
});
