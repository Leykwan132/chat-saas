# WhatsApp Connecting Action Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the WhatsApp card stable during connection, show a compact Connecting/Stop action row, and simplify failures to one Contact support action.

**Architecture:** `ChannelsPage` keeps its subscribed attempt and cancellation mutation, while a small presentational component renders the pending WhatsApp card action as Connecting/Stop or Stopping. A second presentational component supplies the compact error dialog content used by `ConnectWhatsAppButton`.

**Tech Stack:** React, TypeScript, Convex React hooks, React Router, shadcn Button/Dialog/Spinner, Vitest, ReactDOM server rendering.

## Global Constraints

- Use Node.js v22 for every script and test command.
- Keep all code files below 300 lines.
- Use existing semantic Button, Dialog, and Spinner components.
- Keep the existing WhatsApp diagnostics and OAuth flow unchanged.
- Contact support routes to `/contact?intent=support`.

---

### Task 1: Connection Action State

**Files:**
- Create: `src/components/channels/WhatsAppConnectionFeedback.tsx`
- Create: `src/components/channels/WhatsAppConnectionFeedback.test.tsx`
- Modify: `src/pages/ChannelsPage.tsx`

**Interfaces:**
- Consumes: `stopping: boolean` and `onStop: () => void` from the existing pending-card state.
- Produces: `WhatsAppConnectingAction`.

- [ ] **Step 1: Write the failing connecting-row test**

Render `WhatsAppConnectingAction` with `renderToStaticMarkup`. Assert visible `Connecting…` status and a destructive `Stop` button. Render again with `stopping` and assert the disabled `Stopping…` state.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WhatsAppConnectionFeedback.test.tsx`

Expected: FAIL because `WhatsAppConnectingAction` does not exist.

- [ ] **Step 3: Implement cancellation ownership and the compact action row**

Create `WhatsAppConnectingAction` using the existing Spinner and destructive Button. Replace the pending card’s full-width cancellation button with the compact row. Reuse the existing cancellation state and error toast in `ChannelsPage`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WhatsAppConnectionFeedback.test.tsx`

Expected: PASS.

### Task 2: Minimal Error Modal

**Files:**
- Modify: `src/components/channels/WhatsAppConnectionFeedback.test.tsx`
- Modify: `src/components/channels/WhatsAppConnectionFeedback.tsx`
- Modify: `src/components/ConnectWhatsAppButton.tsx`

**Interfaces:**
- Consumes: `WhatsAppDialogState` with `{ kind: 'error', message: string }`.
- Produces: `WhatsAppConnectionErrorContent` with one `/contact?intent=support` action.

- [ ] **Step 1: Write the failing error-modal test**

Render `WhatsAppConnectionErrorContent` inside `MemoryRouter`. Assert the title, supplied message, and one `Contact support` link to `/contact?intent=support`; assert there is no `Try again` or footer `Close` button.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WhatsAppConnectionFeedback.test.tsx`

Expected: FAIL because the current modal renders a centered icon plus Close and Try again actions.

- [ ] **Step 3: Implement the minimal modal**

Create the left-aligned content with DialogTitle and DialogDescription, then one Button using React Router Link with `to="/contact?intent=support"`. Remove the decorative icon and retry callback from `ConnectWhatsAppButton`; preserve the standard dialog X.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WhatsAppConnectionFeedback.test.tsx`

Expected: PASS.

### Task 3: Regression Verification

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: completed Tasks 1 and 2.
- Produces: verified working tree and updated release state.

- [ ] **Step 1: Run focused WhatsApp tests**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WhatsAppConnectionFeedback.test.tsx convex/whatsappConnectionAttempts.test.ts convex/whatsappSignupCompletion.test.ts convex/whatsappCoexistence.test.ts src/lib/whatsappSignupCompletion.test.ts`

Expected: PASS.

- [ ] **Step 2: Run static verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/components/ConnectWhatsAppButton.tsx src/components/channels/WhatsAppConnectionFeedback.tsx src/components/channels/WhatsAppConnectionFeedback.test.tsx src/pages/ChannelsPage.tsx && bunx tsc --noEmit && git diff --check`

Expected: PASS.

- [ ] **Step 3: Update continuity**

Record the customer-visible behavior, verification results, and unreleased status in `CONTINUITY.md`. Do not add a changelog entry until production availability is confirmed.
