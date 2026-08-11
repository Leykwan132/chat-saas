# Web Widget Controls and WhatsApp Ready State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit Web Widget save/publish controls, prevent inactive AI previews from calling AI messaging APIs, and hide completed WhatsApp progress bars.

**Architecture:** Keep the existing Convex mutations unchanged and model frontend availability as pure state derived from saved settings, draft values, and active mode. Move WhatsApp sync rendering into a focused component so the ready-state rule is behavior-tested without growing `ChannelsPage.tsx`.

**Tech Stack:** React 19, TypeScript 6, Convex React hooks, shadcn/ui, Vitest, React DOM server rendering.

## Global Constraints

- Node.js v22 is required for every script and test command.
- Code files remain below 300 lines; extract focused modules instead of growing large files.
- Use existing shadcn Button, Textarea, Alert, Tabs, and Spinner components.
- No Convex schema or function changes are needed.
- Customer-facing changes stay out of the changelog until production availability is confirmed.

---

### Task 1: WhatsApp ready-state presentation

**Files:**
- Create: `src/components/channels/WhatsAppSyncSummary.tsx`
- Create: `src/components/channels/WhatsAppSyncSummary.test.tsx`
- Modify: `src/pages/ChannelsPage.tsx`

**Interfaces:**
- Consumes: `Doc<'channels'>`, `getWhatsAppSyncStatus`, and `getWhatsAppHistoryDisplayProgress`.
- Produces: `WhatsAppSyncSummary({ channel }: { channel: Doc<'channels'> })`.

- [ ] **Step 1: Write failing behavior tests**

Render a completed-history channel whose contact sync is still `syncing` and assert that `Ready` renders without a progress element. Render a history-syncing channel and assert that its progress element remains present.

- [ ] **Step 2: Run the tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/WhatsAppSyncSummary.test.tsx`

Expected: FAIL because `WhatsAppSyncSummary` does not exist.

- [ ] **Step 3: Implement the focused summary component**

Compute `isSyncing` from the four requested/syncing fields. Render `ChannelReadyStatus` when `showCheck` is true. Render `<Progress>` only when `isSyncing && !status.showCheck`; otherwise render detail text when present.

```tsx
const showProgress = isSyncing && status.showCheck !== true;

return (
  <div className="flex w-full flex-col gap-1.5 text-[11px] leading-snug">
    {status.showCheck ? <ChannelReadyStatus label={status.label} /> : <p>{status.label}</p>}
    {showProgress ? <Progress value={getWhatsAppHistoryDisplayProgress(channel)} /> : null}
  </div>
);
```

- [ ] **Step 4: Replace inline WhatsApp status markup**

Import `WhatsAppSyncSummary` in `ChannelsPage.tsx`, replace the existing inline status/progress branch, and remove unused imports and local state derivation.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run the Task 1 Vitest command and confirm both ready and syncing cases pass.

### Task 2: Inactive AI preview guard

**Files:**
- Create: `src/components/channels/webWidgetConfigurationState.ts`
- Create: `src/components/channels/webWidgetConfigurationState.test.ts`
- Modify: `src/components/channels/useWebWidgetPreviewConversation.ts`
- Modify: `src/components/channels/WebWidgetPreview.tsx`
- Modify: `src/components/channels/WebWidgetPreviewComposer.tsx`
- Modify: `src/components/channels/WebWidgetSettingsPanel.tsx`

**Interfaces:**
- Produces: `getWebWidgetPreviewState(activeMode)` returning `{ enabled: boolean; inactiveMessage: string | null }`.
- Changes: `useWebWidgetPreviewConversation(publicKey, enabled)` uses `"skip"` when disabled and rejects local sends before calling the mutation.
- Changes: `WebWidgetPreview` and `WebWidgetPreviewComposer` accept an enabled state and disable focus, input, and submit while inactive.

- [ ] **Step 1: Write failing state tests**

Assert that `traditional` produces a disabled preview with activation guidance and `ai_powered` produces an enabled preview without guidance.

- [ ] **Step 2: Run the tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/webWidgetConfigurationState.test.ts`

Expected: FAIL because the state module does not exist.

- [ ] **Step 3: Implement minimal state derivation and hook guard**

Add the pure active-mode derivation. Pass `"skip"` to `useQuery` while disabled, return an empty conversation, and return `false` from `sendMessage` without invoking `publicReceiveMessage`.

```ts
export function getWebWidgetPreviewState(activeMode: WebWidgetMode) {
  return activeMode === 'ai_powered'
    ? { enabled: true, inactiveMessage: null }
    : {
        enabled: false,
        inactiveMessage: 'Set AI-powered as the active widget to use the live preview.',
      };
}
```

```ts
const storedMessages = useQuery(
  api.webWidget.publicListMessages,
  enabled ? { publicKey, visitorId } : 'skip',
);
```

- [ ] **Step 4: Disable the inactive preview UI**

Thread `enabled` through the preview and composer, use real disabled attributes, and show a shadcn Alert in the settings panel explaining how to activate AI messaging.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run the Task 2 Vitest command and confirm both mode cases pass.

### Task 3: Explicit save and publish controls

**Files:**
- Create: `src/components/channels/TraditionalWidgetActions.tsx`
- Create: `src/components/channels/TraditionalWidgetActions.test.tsx`
- Modify: `src/components/channels/WebWidgetTraditionalPanel.tsx`
- Modify: `src/components/channels/WebWidgetSettingsPanel.tsx`
- Modify: `src/components/channels/WebWidgetDetailsDialog.tsx`

**Interfaces:**
- Produces: `getTraditionalWidgetFormState` from the shared state module with `valid`, `dirty`, `canSave`, and `canActivate`.
- Produces: `TraditionalWidgetActions` using shadcn Buttons and Spinner with separate save and activation callbacks.
- Changes: both panels receive `activeMode` and `activateMode`; the dialog defaults Tabs to Traditional.

- [ ] **Step 1: Write failing action-state and rendered-control tests**

Assert invalid drafts cannot save, changed valid drafts can save but cannot activate until persisted, saved drafts can activate, and active Traditional mode cannot reactivate. Render actions and assert distinct `Save changes` and `Set as active widget` controls with correct disabled states.

- [ ] **Step 2: Run the tests and verify RED**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/channels/webWidgetConfigurationState.test.ts src/components/channels/TraditionalWidgetActions.test.tsx`

Expected: FAIL because the form-state function and actions component do not exist.

- [ ] **Step 3: Implement the actions and mutation wiring**

Use `updateTraditionalSettings` only from `Save changes`. Use `activateMode({ mode: 'traditional' })` only from `Set as active widget`. Add an AI activation action using `activateMode({ mode: 'ai_powered' })`. Keep distinct pending states and success/error toasts.

```tsx
<TraditionalWidgetActions
  canSave={formState.canSave}
  canActivate={formState.canActivate}
  saving={saving}
  activating={activating}
  onSave={saveChanges}
  onActivate={activateTraditional}
/>
```

```ts
await updateTraditionalSettings({
  agentId,
  label: label.trim(),
  prefillMessage: prefillMessage.trim(),
  hidePoweredBy,
});
```

- [ ] **Step 4: Remove installation side effects and use shadcn Textarea**

Make copy/download operate only on the snippet. Replace the raw textarea with the installed `Textarea` component and apply `data-invalid`/`aria-invalid` for invalid drafts.

- [ ] **Step 5: Default to Traditional**

Pass `defaultValue="traditional"` to Tabs and thread the active mode to both panels without mutating it.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Task 3 Vitest command plus existing Web Widget and channel layout suites.

### Task 4: Verification and publication

**Files:**
- Modify: `CONTINUITY.md`
- Include: the approved design, this plan, implementation, and regression tests.

- [ ] **Step 1: Run scoped quality checks**

Run focused Vitest suites, scoped ESLint for touched TS/TSX files, `bunx tsc --noEmit`, `git diff --check`, and file-length checks.

- [ ] **Step 2: Run the production build**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

Expected: exit 0.

- [ ] **Step 3: Update continuity**

Record customer-visible outcomes, test receipts, branch/PR state, and unreleased status. Do not edit the release changelog.

- [ ] **Step 4: Commit and publish**

Create `codex/web-widget-controls-polish`, stage only files in this plan, commit with a concise message, push to origin, and open a draft PR into the repository default branch with root cause and validation details.
