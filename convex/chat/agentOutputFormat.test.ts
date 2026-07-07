import { expect, test } from "vitest";
import { buildAgentOutputFormatBlock } from "./agentOutputFormat";

test("requires every final answer to use the standard response envelope", () => {
  const block = buildAgentOutputFormatBlock();

  expect(block).toContain("## Output Format — REQUIRED");
  expect(block).toContain("Every final answer MUST use exactly this envelope");
  expect(block).toContain("<workflow_matches>");
  expect(block).toContain("</workflow_matches>");
  expect(block).toContain("<customer_response>");
  expect(block).toContain("</customer_response>");
  expect(block).toContain("<media_to_send>");
  expect(block).toContain("</media_to_send>");
});

test("requires workflow match array before customer response", () => {
  const block = buildAgentOutputFormatBlock();

  expect(block).toContain("Put only a JSON array inside `<workflow_matches>`");
  expect(block).toContain("If no workflow node condition matches, output []");
  expect(block).toContain("Include one object for every matching Workflow Runtime node");
  expect(block.indexOf("<workflow_matches>")).toBeLessThan(
    block.indexOf("<customer_response>"),
  );
});

test("requires empty media array when no media should be sent", () => {
  const block = buildAgentOutputFormatBlock();

  expect(block).toContain("If there is no media to send, output [] inside `<media_to_send>`");
  expect(block).toContain("Do not omit `<media_to_send>`");
});

test("requires URL and type objects when media should be sent", () => {
  const block = buildAgentOutputFormatBlock();

  expect(block).toContain("matching workflow node `nodeId`");
  expect(block).toContain("exact `url` and `type` values");
  expect(block).toContain("This applies to images, videos, audio, and files");
  expect(block).not.toContain("clientId");
  expect(block).not.toContain("reason");
});
