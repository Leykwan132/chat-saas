# Agent Template Library and Retired Model Fallback Design

## Goal

Align Agent Setup's system-prompt Template Library with the two goals offered during agent creation, ensure agents that still use either retired model move safely to DeepSeek V4 Flash, and add concise scenario guidance to every supported model HoverCard.

## Scope

This change applies to the Template Library beside the System Prompt field in Agent Setup. It does not change the separate WhatsApp message-template library used to create Follow-up, Reminder, and Broadcast templates.

The Agent Setup library will show exactly:

- Support
- Book a Service

The retired-model migration will cover exactly:

- `amazon/nova-micro-v1`
- `google/gemini-3.1-flash-lite`

Every supported model HoverCard will include one or two recommended scenarios.

## Shared Agent Goal Templates

`shared/agentCreationGoals.ts` remains the source of truth for the two agent goals. Each goal exposes the presentation and prompt content needed by both agent creation and Agent Setup:

- stable goal identifier
- label
- description
- role
- goal
- conversation approach
- guardrails
- error handling

Agent creation continues building a business-specific prompt by inserting the saved business name and business description into this shared structure.

Agent Setup builds the selected template from the same shared goal definition. When an agent has saved business details, the applied prompt includes them. For a legacy agent without saved business details, the template uses a concise generic business-context instruction rather than inserting blank or undefined values.

## Agent Setup Template Library

The dropdown contains only Support and Book a Service, in that order. It reuses the labels and descriptions shown during agent creation and uses the corresponding Headphones and CalendarCheck icons.

Selecting a template replaces the System Prompt field with the prompt generated from the shared goal definition. It also writes the existing compatible template key:

- Support uses `support`.
- Book a Service uses `sales`.

The persisted schema and validator continue accepting the existing `blank`, `sales`, `productSales`, and `support` values so historical agents remain readable and editable. General, Real estate sales, and Product sales are removed only from the visible Template Library; their stored keys are not migrated or invalidated.

The legacy `src/lib/agentTemplates.ts` entries may remain only where needed for compatibility. The visible options and newly applied prompt content must come from the shared agent-goal source so the two flows cannot drift.

## Retired Model Migration

The existing Gemini-only migration becomes a retired-model migration. Its pure patch helper returns the same replacement for either retired model:

```text
model: deepseek/deepseek-v4-flash
provider: openrouter
```

Every other model returns no patch. This keeps the migration idempotent: once an agent is on DeepSeek V4 Flash, rerunning the migration makes no change.

The migration continues using `@convex-dev/migrations`, the existing `agents` table, and bounded batches. The runner name and operational documentation must clearly describe both retired models rather than only Google Gemini.

## Release Sequence

The migration must be deployed while the retired model identifiers are still recognizable by the migration code. Run it and verify that no affected agents remain before deploying the catalog state that treats those models as unavailable.

The migration changes persisted agent configuration only. It does not add runtime fallback behavior that silently changes arbitrary invalid models during a request.

## Model Recommendations

Each model scorecard stores a typed `recommendedFor` list containing one or two short customer scenarios. The HoverCard renders this list after Quality, Speed, Reasoning, and Value under the heading `Recommended for`.

Each scenario is a plain row rather than a badge or card. A small green rounded background contains a white check, followed by normal foreground text. The existing rating, model identity, two-sentence description, and four metric scores remain unchanged.

The scenario mapping is:

| Model | Recommended scenarios |
| --- | --- |
| Ilmu Mini | Malay-language conversations; Budget-friendly FAQs |
| Xiaomi MiMo | Chinese-language conversations; General customer support |
| DeepSeek V4 Flash | Everyday customer support; Chinese and English conversations |
| GPT-OSS 120B | Budget-friendly reasoning; English-language support |
| GPT-5.6 Luna | Complex customer conversations; Higher-quality responses |
| NVIDIA Nemotron 3.5 Lightning | Fast English-language replies; High-volume support |
| Qwen3.7 Flash | Fast Chinese-language replies; Chinese and English conversations |

## Testing

Tests will verify:

- Agent Setup exposes exactly Support and Book a Service, in the same order as agent creation.
- Labels and descriptions come from the shared goal definitions.
- Applying either option produces the same prompt structure and safety guidance used by agent creation.
- Existing compatible template keys remain `support` and `sales`.
- Amazon Nova Micro migrates to DeepSeek V4 Flash with provider `openrouter`.
- Google Gemini 3.1 Flash Lite migrates to DeepSeek V4 Flash with provider `openrouter`.
- DeepSeek and other supported models receive no migration patch.
- Every enabled scorecard contains one or two non-empty recommended scenarios with the approved wording.
- HoverCards render `Recommended for` after the four metrics.
- Each scenario has a green rounded check background, white check icon, and plain foreground text without a scenario card or badge.
- Focused tests, scoped lint, TypeScript, production build, application tests, Docs tests, whitespace checks, and code-size limits pass.

## Release Documentation

This is customer-facing but production availability is unconfirmed. Record the completed local state in `CONTINUITY.md` and leave the public changelog unchanged until the production release date is confirmed.
