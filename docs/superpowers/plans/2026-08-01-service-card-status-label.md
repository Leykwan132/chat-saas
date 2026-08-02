# Service Card Status Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show `Active` or `Inactive` immediately before each service card switch while preserving the existing switch behavior and card layout.

**Architecture:** Derive the visible label directly from each card’s existing `service.isActive` value. Verify both states by server-rendering the real Services page with controlled Convex query results and checking visible copy plus switch accessibility state.

**Tech Stack:** React, React Router, Tailwind CSS, Vitest, React DOM server rendering

## Global Constraints

- Use Node.js v22 for every script and test command.
- Keep the label and switch inside the existing click-isolated control area.
- Preserve the existing switch action, disabled state, accessible `Turn on` / `Turn off` label, emerald checked styling, booking count, and card dimensions.
- Use neutral muted text for `Active` and `Inactive`.
- Do not add backend fields, mutations, badges, new colors, or status controls elsewhere.
- Keep every code file below 300 lines and do not add comments.

---

### Task 1: Visible service status labels

**Files:**
- Create: `src/pages/ServicesPage.test.tsx`
- Modify: `src/pages/ServicesPage.tsx:246-260`

**Interfaces:**
- Consumes: `ServiceRow.isActive`, the existing `Switch` checked state, and the `ServicesPage` route.
- Produces: visible `Active` / `Inactive` text aligned with each switch’s state and accessible action label.

- [x] **Step 1: Write the failing rendered-page test**

Create `src/pages/ServicesPage.test.tsx` with controlled active and inactive services:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, test, vi } from 'vitest';
import ServicesPage from './ServicesPage';

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: () => ({
    services: [
      {
        _id: 'service-active',
        name: 'Consultation',
        isActive: true,
        sortOrder: 0,
        durationMinutes: 30,
        fields: [],
        salesStyle: 'neutral',
        assignmentStrategy: 'balanced',
      },
      {
        _id: 'service-inactive',
        name: 'Installation',
        isActive: false,
        sortOrder: 1,
        durationMinutes: 60,
        fields: [],
        salesStyle: 'neutral',
        assignmentStrategy: 'balanced',
      },
    ],
    bookings: [],
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, isLoading: false }),
}));

test('service cards show status text aligned with their switches', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/dashboard/agent-1/services']}>
      <Routes>
        <Route path="/dashboard/:agentId/services" element={<ServicesPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(markup).toContain('>Active</span>');
  expect(markup).toContain('>Inactive</span>');
  expect(markup).toContain('aria-checked="true"');
  expect(markup).toContain('aria-label="Turn off Consultation"');
  expect(markup).toContain('aria-checked="false"');
  expect(markup).toContain('aria-label="Turn on Installation"');
});
```

- [x] **Step 2: Run the test and verify the intended failure**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicesPage.test.tsx`

Expected: FAIL because neither visible status label is rendered yet.

- [x] **Step 3: Add the minimal status label**

Change the existing click-isolated wrapper to a horizontal flex row and insert the label before the switch:

```tsx
<div
  className="relative z-10 flex shrink-0 items-center gap-1.5"
  onClick={(event) => {
    event.preventDefault();
    event.stopPropagation();
  }}
  onKeyDown={(event) => event.stopPropagation()}
>
  <span className="text-xs text-muted-foreground">
    {service.isActive ? 'Active' : 'Inactive'}
  </span>
  <Switch
    checked={service.isActive}
    onCheckedChange={onToggleActive}
    disabled={!canManage}
    aria-label={`${service.isActive ? 'Turn off' : 'Turn on'} ${service.name}`}
    className="scale-90 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-input"
  />
</div>
```

- [x] **Step 4: Run focused verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/pages/ServicesPage.test.tsx src/pages/pageHeaderChrome.test.ts src/pages/PageGuideSections.test.ts`

Expected: all tests PASS.

- [x] **Step 5: Run the production build and whitespace check**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

Expected: TypeScript and Vite build PASS.

Run: `git diff --check`

Expected: no output and exit code 0.
