# Playground Response Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Playground users open a completed assistant response in a full-height, scrollable dialog.

**Architecture:** Keep selected-response state in `TestChatWindow`, where message state already lives. Add a focused dialog component that owns only the full-height dialog layout and renders its supplied response content.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn dialog primitives, Vitest.

## Global Constraints

- Use Node v22 for every script and test command.
- Keep production files at or below 300 lines of code.
- Do not modify streaming or pending assistant messages.

---

### Task 1: Expanded response dialog

**Files:**
- Create: `src/components/PlaygroundAssistantResponseDialog.tsx`
- Test: `src/components/PlaygroundAssistantResponseDialog.test.tsx`

**Interfaces:**
- Consumes: `open`, `onOpenChange`, `title`, and React `children`.
- Produces: `PlaygroundAssistantResponseDialog`, a viewport-height dialog with an independently scrollable body.

- [ ] **Step 1: Write the failing test**

```tsx
const markup = renderToStaticMarkup(
  <PlaygroundAssistantResponseDialog
    onOpenChange={() => undefined}
    open
    title="Agent response"
  >
    <p>Long response</p>
  </PlaygroundAssistantResponseDialog>,
);

expect(markup).toContain("Agent response");
expect(markup).toContain("Long response");
expect(markup).toContain("overflow-y-auto");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/PlaygroundAssistantResponseDialog.test.tsx`

Expected: FAIL because `PlaygroundAssistantResponseDialog` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
export function PlaygroundAssistantResponseDialog({ children, onOpenChange, open, title }: Props) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex h-[min(92vh,960px)] flex-col overflow-hidden p-0">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/PlaygroundAssistantResponseDialog.test.tsx`

Expected: PASS.

### Task 2: Playground response activation

**Files:**
- Modify: `src/components/TestChatWindow.tsx`
- Test: `src/components/PlaygroundAssistantResponseDialog.test.tsx`

**Interfaces:**
- Consumes: the dialog component from Task 1 and completed assistant message text parts.
- Produces: click and keyboard activation for completed assistant messages, and the selected response in the dialog body.

- [ ] **Step 1: Write the failing test**

```tsx
expect(markup).toContain("response content");
expect(markup).toContain("overflow-y-auto");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/PlaygroundAssistantResponseDialog.test.tsx`

Expected: FAIL until the dialog renders the supplied response body.

- [ ] **Step 3: Write minimal implementation**

```tsx
const isResponseExpandable = message.status !== "streaming" && message.status !== "pending";

<div
  onClick={isResponseExpandable ? () => setExpandedResponse(message) : undefined}
  onKeyDown={isResponseExpandable ? handleKeyboardActivation : undefined}
  role={isResponseExpandable ? "button" : undefined}
  tabIndex={isResponseExpandable ? 0 : undefined}
>
  {response}
</div>
```

- [ ] **Step 4: Run focused verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/PlaygroundAssistantResponseDialog.test.tsx && bun run build`

Expected: focused test and production build exit 0.
