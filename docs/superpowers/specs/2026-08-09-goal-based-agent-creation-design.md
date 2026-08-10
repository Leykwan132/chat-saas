# Goal-Based Agent Creation Design

## Status

Approved in conversation on 2026-08-09. Implementation has not started.

## Objective

Replace model-and-template-oriented agent creation with a short onboarding flow based on the business the agent represents and the outcome the agent should achieve. The finished flow must be ready to test locally.

## User Experience

### Step 1: Agent and business identity

Collect these fields together:

- Agent name, required.
- Business name, required.
- Business description, optional.

The business description should explain what the business offers, who it serves, or any context the agent should know. The form must trim values and prevent advancement until both required fields contain non-whitespace text.

### Step 2: Agent goal

Replace the template and model controls with two goal choices:

- **Support**: Answer customer questions, resolve issues, explain next steps, and escalate when human help is needed.
- **Book a Service**: Answer service questions, understand what the customer needs, and guide them toward booking an appointment.

One goal is required. The shared default agent model is selected automatically and is not shown during creation. Model and prompt controls remain available in agent setup after creation.

### Creating state

Retain the existing creation transition, but describe business context, goal instructions, knowledge base preparation, and readiness rather than applying a role and model.

### Success state

Show three next actions:

- **Train your agent** opens the agent knowledge base.
- **Try in Playground** opens agent setup with the playground available through the existing setup experience.
- **Deploy to a channel** opens `/dashboard/{agentId}/channels`.

Deployment itself stays in the existing Channels page. The creation wizard does not duplicate channel connection or assignment controls.

## Data Model

Add these optional fields to agent documents so existing rows remain valid without a migration:

- `businessName`
- `businessDescription`
- `goal`, limited to `support` or `bookService`

New creation requests require `businessName` and `goal`. The backend trims all text, rejects an empty business name, and omits an empty business description.

Existing `templateKey` values remain supported for old agents and advanced setup. New Support agents map to the existing support template key. New Book a Service agents map to the existing sales template key for compatibility, while their actual system prompt comes from the new goal-based prompt builder.

Agent updates must preserve the stored business fields and goal unless the update request explicitly changes them. This feature does not add business-profile editing to agent setup.

## Prompt Construction

A shared deterministic prompt builder accepts the business name, optional description, and selected goal. It returns the complete initial system prompt without calling an LLM.

Every generated prompt contains:

- The agent's role and represented business name.
- The user-supplied business description when present.
- The selected goal and expected conversation behavior.
- Instructions to use business-provided knowledge and conversation context.
- Guardrails against inventing pricing, availability, policies, service details, or completed actions.
- A clear escalation path when information or authority is missing.

The Support variant prioritizes accurate answers, patient issue resolution, safe detail collection, and human escalation.

The Book a Service variant prioritizes understanding service needs, answering known questions, collecting relevant booking details, and using available booking capabilities. It must not claim that a booking is confirmed unless the booking action succeeds, and it must not invent services, schedules, prices, or availability.

Prompt generation lives in shared application code so the backend owns the final value and tests can exercise it without UI rendering.

## Component Boundaries

The existing creation page should be decomposed rather than expanded beyond the repository's 300-line code-file limit:

- A wizard state module owns steps, validation, and goal metadata.
- An identity step component owns the three business fields.
- A goal step component owns the two accessible goal choices.
- Creation and success components render progress and next actions.
- The page coordinates authentication, the create mutation, analytics, and navigation.
- A shared prompt module owns goal types, display copy, template-key mapping, and deterministic prompt construction.

Existing visual primitives and motion language should be reused. Goal options should use the project's established selection components and semantic design tokens.

## Data Flow

1. The user enters agent and business identity.
2. The user selects Support or Book a Service.
3. The page submits trimmed identity data and the goal to `agents.create`; it does not submit a model or system prompt.
4. The mutation selects the shared default model, builds the prompt, stores the business context and goal, provisions the existing default workflow, and returns the agent ID.
5. The success screen routes the user to training, testing, or Channels.

## Error Handling

- Client validation blocks missing agent name, business name, or goal.
- Backend validation repeats all required checks and rejects unsupported goals.
- Creation failures return the user to the goal step with the submitted fields preserved and an actionable error.
- A failed create attempt can be retried without duplicate submissions.
- The optional description is omitted when blank rather than replaced with generic fallback text.

## Compatibility and Scope

- Existing agents require no migration.
- Existing advanced model and prompt editing remains unchanged.
- Existing legacy prompt templates remain available outside the new creation flow.
- This work does not connect channels inside the wizard.
- This work does not create services, schedules, or availability.
- This work does not use an LLM to generate system prompts.

## Testing and Local Readiness

Add focused coverage for:

- Prompt output for both goals with and without a business description.
- Goal-to-template compatibility mapping.
- Backend trimming, required-field validation, default-model selection, and persisted metadata.
- Wizard step validation and removal of creation-time template/model selection.
- All three success actions, including the Channels route.
- Retry behavior after a failed mutation.

Run tests and scripts under Node 22, run the focused suites, run the production build, and check the diff for whitespace errors. Start the local development server and report the local URL plus any environment-dependent limitations.

## Release Handling

This is a customer-facing creation-flow improvement but remains unreleased until production availability is confirmed. Record the completed local work in `CONTINUITY.md`; do not add it to the production changelog yet.
