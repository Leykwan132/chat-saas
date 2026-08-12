# Model Announcements and Scorecards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved click-open announcement panel, model scorecard HoverCards, and recognizable Qwen branding.

**Architecture:** Local typed data modules own announcement and scorecard content. `WhatsNewDialog` composes shadcn Popover, Accordion, ScrollArea, and Dialog, while `ModelScoreHoverCard` wraps each existing model row without changing its selection behavior. Convex model pricing supplies the local Qwen logo URL to the existing picker interface.

**Tech Stack:** React, TypeScript, Vite, shadcn/ui, Radix primitives, `@smastrom/react-rating`, Convex, Vitest, Node.js 22, Bun.

## Global Constraints

- Keep source files below 300 lines and avoid code comments.
- Use the existing shadcn Popover, Accordion, HoverCard, Badge, Dialog, Button, and ScrollArea components.
- Use Lucide’s `Package` icon for the header button.
- Ratings are static Kilobot editorial guidance, not external benchmark or customer-review claims.
- Preserve existing model selection and upgrade behavior.
- Preserve the unrelated `convex/_generated/api.d.ts` and `pricing-knowledge-base-updated.md` working-tree changes.
- Do not update the production changelog until availability is confirmed.

---

### Task 1: Lock scorecard and logo behavior

**Files:**
- Create: `src/config/modelScorecards.test.ts`
- Create: `src/components/ModelScoreHoverCard.test.ts`
- Modify: `convex/llm/modelPricing.test.ts`
- Create: `public/model-logos/qwen.svg`
- Create: `src/config/modelScorecards.ts`
- Create: `src/components/ModelScoreHoverCard.tsx`
- Modify: `src/components/ModelPickerItem.tsx`
- Modify: `convex/llm/modelPricing.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: `MODEL_SCORECARDS: Record<EnabledModelId, ModelScorecard>` and `getModelScorecard(modelId: string): ModelScorecard | null`.
- Produces: `ModelScoreHoverCard({ modelId, children })` that preserves its child trigger.
- Consumes: `ModelPickerOption.value` and the existing Qwen `imageUrl` transport.

- [ ] **Step 1: Write failing scorecard, HoverCard, and Qwen-logo tests**

Assert all seven enabled model IDs have bounded overall/metric values, explicit language strengths, and the approved initial content. Assert the HoverCard imports `Rating`, passes `readOnly`, renders four metrics and language badges, and wraps model rows. Assert Qwen pricing returns `/model-logos/qwen.svg`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.test.ts convex/llm/modelPricing.test.ts`

Expected: FAIL because scorecards, HoverCard composition, and the local Qwen image do not exist.

- [ ] **Step 3: Add the local Qwen SVG and scorecard record**

Define `ModelMetricScore`, `ModelLanguageStrength`, and `ModelScorecard` with numeric scores constrained by tests to `0 <= value <= 5`. Add exactly the seven approved records and a null-returning lookup for unknown historical IDs.

- [ ] **Step 4: Build the read-only model HoverCard**

Import the package stylesheet once in `src/main.tsx`. Render the overall `Rating`, visible score text, four supporting metric rows, language `Badge` values, and `bestFor` copy inside `HoverCardContent`.

- [ ] **Step 5: Wrap every current picker row**

Wrap `ModelSelectorItem` with `ModelScoreHoverCard` using `option.value`. Keep `handleSelect`, `aria-disabled`, selected styling, price rendering, and upgrade behavior unchanged.

- [ ] **Step 6: Route Qwen to its local brand asset**

Set Qwen3.7 Flash’s pricing `imageUrl` to `/model-logos/qwen.svg` while retaining `chefSlug: "qwen"`.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run the Task 1 command and expect all tests to pass.

### Task 2: Replace the immediate dialog with the announcement panel

**Files:**
- Modify: `src/components/whats-new/announcements.ts`
- Create: `src/components/whats-new/AnnouncementDetailsDialog.tsx`
- Create: `src/components/whats-new/AnnouncementPopoverList.tsx`
- Modify: `src/components/WhatsNewDialog.tsx`
- Modify: `src/components/WhatsNewDialog.test.ts`

**Interfaces:**
- Produces: `Announcement` records with `id`, `title`, `summary`, `details`, `isNew`, `icon`, and `actionLabel`.
- Produces: `AnnouncementPopoverList({ announcements, onViewDetails })` with one-open Accordion behavior.
- Produces: `AnnouncementDetailsDialog({ announcement, open, onOpenChange })`.

- [ ] **Step 1: Write failing announcement interaction tests**

Assert the header control uses `Package` and visible `What’s new` copy, the click surface is a `PopoverTrigger`, the list uses `Accordion type="single" collapsible`, the first row has a `New` Badge, and the expanded content has exactly one `View full update` action that selects the full Dialog.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.ts src/components/SupportHoverCard.test.ts`

Expected: FAIL because the current icon-only trigger opens the Dialog immediately.

- [ ] **Step 3: Extend structured announcement data**

Rename the first item to `Model support update`, add `Bot` as its icon component, mark it new, and preserve the four approved model recommendations.

- [ ] **Step 4: Implement the reference-style Popover and Accordion list**

Render `What’s new in Kilobot`, a bounded ScrollArea, roomy disclosure rows, optional `Badge`, summary text, and one Button in each Accordion content area.

- [ ] **Step 5: Implement the selected-announcement Dialog handoff**

Opening details closes the Popover, stores the selected announcement, and opens the full Dialog with its title, summary, and detail list.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Task 2 command and expect all tests to pass.

### Task 3: Verify and prepare local review

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all Task 1 and Task 2 deliverables.
- Produces: a verified local branch and release sequencing record.

- [ ] **Step 1: Run scoped lint**

Run ESLint against all changed TypeScript and TSX source/test files under Node 22.

- [ ] **Step 2: Run TypeScript and the production build**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

- [ ] **Step 3: Run whitespace and status checks**

Run: `git diff --check && git status --short` and verify unrelated user changes remain untouched.

- [ ] **Step 4: Update continuity**

Record the click-open announcement panel, scorecard metrics/languages, Qwen logo correction, verification evidence, and the still-required migration-before-removal release order.
