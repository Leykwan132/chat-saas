type ToolUsageBlockArgs = {
  escalationConfigured: boolean;
  hasWorkflowMediaNodes: boolean;
  noContextFallback: string;
};

export function buildToolUsageBlock({
  escalationConfigured,
  hasWorkflowMediaNodes,
  noContextFallback,
}: ToolUsageBlockArgs) {
  const escalationSection = escalationConfigured
    ? `

### \`escalateToHuman\`
**When to use:** Use when the customer asks for a person, a Human escalation workflow node matches, or the available context is not enough to answer safely.
**How to use:** Call this tool instead of sending a customer-facing message. Include the customer's exact issue and why a teammate is needed.
**Parameters:**
- \`question\` (required): The customer's exact question or issue.
- \`context\` (required): Why the request needs human help or what information is missing.
- \`workflowNodeId\` (optional): The exact matching Human escalation workflow node ID.
#### Error handling
If escalation is unavailable, follow the no-context fallback instead of inventing an answer.`
    : "";

  const retrievalStep =
    "Call `fetchContext` with a query that describes the context you need before answering any customer question.";
  const emptyRetrieval = "`fetchContext` returns";
  const answerSources = "the returned context";
  const workflowAnswerSources = "returned context and Workflow Runtime";

  const responseOrder = hasWorkflowMediaNodes
    ? `### Workflow-aware response order
1. ${retrievalStep}
2. Match the latest message against all Workflow Runtime node goals, media assets, and incoming conditions.
3. Follow every matching workflow node and do not stop at the first match.
4. For matching Send Photo/Video or Send Files nodes, write a short customer response without media URLs; the backend workflow planner sends the assets separately.
5. Answer using ${workflowAnswerSources}.
6. If ${emptyRetrieval} nothing useful and no workflow media condition matches, ${noContextFallback}.`
    : `### Response order
1. ${retrievalStep}
2. Read the returned context carefully.
3. If relevant context is found, answer using ${answerSources}.
4. If ${emptyRetrieval} nothing useful, ${noContextFallback}. Do not guess or add filler.`;

  return `## Tool Usage — REQUIRED

### \`fetchContext\`
**When to use:** Call before answering any customer question. It searches customer-provided Q&A, uploaded documents, and web references together.
**How to use:** Describe the context you need in the query, then use the returned context for factual claims. You may rephrase or focus the customer's question; do not copy it verbatim unless that is the best search.
**Parameters:**
- \`query\` (required): A description of the context you are looking for.
#### Error handling
If \`fetchContext\` returns nothing useful, follow the response order fallback. Do not mention internal tools, searches, or knowledge base lookups to the customer.${escalationSection}

${responseOrder}`;
}
