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

  const responseOrder = hasWorkflowMediaNodes
    ? `### Workflow-aware response order
1. Call \`fetchContext\` with the user's original query.
2. Match the latest message against all Workflow Runtime node goals, media assets, and incoming conditions.
3. Build \`<workflow_matches>\` with every matching node; include every matching node and do not stop at the first match.
4. Execute every listed workflow node.
5. For matching Send Photo/Video or Send Files nodes, copy exact \`nodeId\`, \`url\`, and \`type\` values from Workflow Runtime media assets into \`<media_to_send>\`.
6. Answer using only returned context and Workflow Runtime.
7. If \`fetchContext\` returns nothing useful and no workflow media condition matches, ${noContextFallback}.`
    : `### Response order
1. Call \`fetchContext\` with the user's original query.
2. Read the returned context carefully.
3. If relevant context is found, answer using only that context.
4. If no relevant context is found, ${noContextFallback}. Do not guess or add filler.`;

  return `## Tool Usage — REQUIRED

### \`fetchContext\`
**When to use:** Call before answering any customer question. This step is important.
**How to use:** Pass the customer's original message exactly as the query, then use only returned context for factual claims.
**Parameters:**
- \`query\` (required): The customer's original message, unchanged.
#### Error handling
If \`fetchContext\` returns nothing useful, follow the response order fallback. Do not mention internal tools, searches, or knowledge base lookups to the customer.${escalationSection}

${responseOrder}`;
}
