# Focused Model Announcement and Language Scores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace qualitative language labels with visible numeric fit scores and turn the expanded model announcement into a focused release story.

**Architecture:** Keep model fit as typed editorial data, changing each language entry from a string strength to a bounded numeric score. Render announcement content from structured spotlight, model-card, and retirement records through a dedicated component so the accordion remains responsible only for disclosure behavior.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide icons, shadcn Accordion/HoverCard, Vitest

## Global Constraints

- Use Node.js v22 for every script and test command.
- Keep every code file below 300 lines and add no code comments.
- Preserve the existing overall StickerStar rating and its amber styling.
- Preserve the existing modal banner, crop, accordion disclosure behavior, and collapsed-row content.
- Production availability remains unconfirmed, so do not update the public changelog.

---

### Task 1: Numeric language fit scores

**Files:**
- Modify: `src/config/modelScorecards.test.ts`
- Modify: `src/components/ModelScoreHoverCard.test.tsx`
- Modify: `src/config/modelScorecards.ts`
- Modify: `src/components/ModelScoreHoverCard.tsx`

**Interfaces:**
- Produces: `ModelLanguageScore = { name: 'Malay' | 'Chinese' | 'English'; score: number }`.
- Produces: HoverCard language rows containing a language name, `x.x / 5`, and a progress track whose accessible value is the score.

- [x] **Step 1: Write failing scorecard and HoverCard tests**

Assert all language values are bounded and the representative records are numeric:

```ts
expect(scorecard.languages.every(({ score }) => score > 0 && score <= 5)).toBe(true);
expect(getModelScorecard('qwen/qwen3.7-flash')?.languages).toEqual([
  { name: 'Chinese', score: 5 },
  { name: 'English', score: 4 },
]);
```

Assert the HoverCard contains `Chinese 5.0 / 5` and `English 4.0 / 5`, with no `Primary` or `Strong` copy.

- [x] **Step 2: Run Task 1 tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.test.tsx
```

Expected: FAIL because the data still exposes `strength` strings and the HoverCard still renders badges.

- [x] **Step 3: Replace strengths with scores and render progress rows**

Use the approved mapping in `MODEL_SCORECARDS`: `Primary = 5`, `Strong = 4`, and `Supported = 3`. Replace the badge group with a definition list:

```tsx
<dl className="flex flex-col gap-2.5">
  {scorecard.languages.map((language) => (
    <div key={language.name} className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <dt>{language.name}</dt>
        <dd className="font-medium">{language.score.toFixed(1)} / 5</dd>
      </div>
      <div
        role="progressbar"
        aria-label={`${language.name} language fit`}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={language.score}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${language.score * 20}%` }}
        />
      </div>
    </div>
  ))}
</dl>
```

- [x] **Step 4: Verify Task 1 GREEN**

Run the Task 1 test command again. Expected: both files pass.

- [x] **Step 5: Commit Task 1**

```bash
git add src/config/modelScorecards.ts src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.tsx src/components/ModelScoreHoverCard.test.tsx
git commit -m "Show numeric model language scores"
```

---

### Task 2: Focused announcement release story

**Files:**
- Modify: `src/components/WhatsNewDialog.test.tsx`
- Modify: `src/components/whats-new/announcements.ts`
- Create: `src/components/whats-new/AnnouncementReleaseDetails.tsx`
- Modify: `src/components/whats-new/AnnouncementDialogList.tsx`
- Modify: `CONTINUITY.md`

**Interfaces:**
- Produces: structured announcement `spotlight`, `modelCards`, and `retirement` records.
- Produces: `AnnouncementReleaseDetails({ announcement }: { announcement: Announcement })`.
- Consumes: the existing formatted announcement date in `AnnouncementDialogList`.

- [x] **Step 1: Write the failing announcement regression**

Assert expanded content includes a `CalendarDays` icon, `Released on 12 Aug 2026`, `More choice for half a credit`, `0.5 credits/message`, the three supporting model cards, and `Retired models`. Assert it contains no `ul` element.

- [x] **Step 2: Run Task 2 test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx
```

Expected: FAIL because expanded content still uses a plain date and bullet list.

- [x] **Step 3: Add structured announcement data**

Replace `details: string[]` with:

```ts
spotlight: {
  eyebrow: 'New 0.5-credit tier',
  title: 'More choice for half a credit',
  description: 'Use GPT-OSS 120B for budget-friendly reasoning or Qwen3.7 Flash for fast Chinese conversations.',
  value: '0.5 credits/message',
},
modelCards: [
  { title: 'NVIDIA Nemotron 3.5 Lightning', description: 'Fast English responses', value: '1 credit/message' },
  { title: 'DeepSeek V4 Flash', description: 'Balanced everyday support', value: '1 credit/message' },
  { title: 'GPT-5.6 Luna', description: 'Higher overall performance', value: '2 credits/message' },
],
retirement: {
  label: 'Retired models',
  description: 'Amazon Nova Micro and Google Gemini 3.1 Flash Lite are no longer available.',
},
```

- [x] **Step 4: Render the release hierarchy**

Create `AnnouncementReleaseDetails` with one tinted spotlight panel, a responsive model-card grid, and a muted retirement footer. In `AnnouncementDialogList`, render `CalendarDays` beside `Released on {date}` and mount `AnnouncementReleaseDetails` below it.

- [x] **Step 5: Run the focused verification gate**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/WhatsNewDialog.test.tsx src/components/SupportHoverCard.test.ts src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.test.tsx && bunx eslint src/components/WhatsNewDialog.test.tsx src/components/whats-new/announcements.ts src/components/whats-new/AnnouncementReleaseDetails.tsx src/components/whats-new/AnnouncementDialogList.tsx src/config/modelScorecards.ts src/config/modelScorecards.test.ts src/components/ModelScoreHoverCard.tsx src/components/ModelScoreHoverCard.test.tsx && bun run build && git diff --check
```

Expected: focused tests, scoped ESLint, TypeScript, production build, and whitespace checks pass.

- [x] **Step 6: Record and commit Task 2**

Update `CONTINUITY.md` with both customer-visible outcomes and verification evidence, then run:

```bash
git add CONTINUITY.md docs/superpowers/plans/2026-08-12-focused-model-announcement-language-scores.md src/components/WhatsNewDialog.test.tsx src/components/whats-new/announcements.ts src/components/whats-new/AnnouncementReleaseDetails.tsx src/components/whats-new/AnnouncementDialogList.tsx
git commit -m "Focus model support announcement"
```
