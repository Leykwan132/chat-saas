<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->


## Important rules
* Build modular first. No code files longer than 300 lines of code! Documentation, plans etc. can be as long as needed, but code files must be modular. 
* Think ahead! Do not write code that you know will need to be changed later without planning for that change now. So keep entrypoints stable and isolate logic into smaller modules from the start!
* Do not limit yourself due to the LOC limit! If a task requires more code, split it into multiple files/modules/functions
* Do not add default fallbacks during development phase. Is something fails, let it fail, so we can fix it!
* Do not leavy empty try-catch blocks anywhere!
* Do not reinvent the wheel! Use open source, self-hosted libraries when needed. Ask the user, and help them qualify their selection. 
* Design UI for the end-user, not for the schema! 


## Code Style
- No Comments
- Code should be self-explanatory. Comments should be avoided as much as possible.
- Write clear, descriptive variable and function names
- Structure code so its intent is obvious
- Only add comments if absolutely required (e.g., explaining a non-obvious workaround or complex algorithm that cannot be simplified)
- If code needs a comment to be understood, refactor it first

## Continuity Ledger (compaction-safe)

Maintain a single continuity file for this workspace: `CONTINUITY.md`.
`CONTINUITY.md` is the canonical briefing designed to survive compaction; do not rely on earlier chat/tool output unless it's reflected there.

## Environment Rules
- This project strictly requires Node v22.
- Before executing any script or running tests, always explicitly verify or invoke `nvm use 22` in the same shell execution sequence.
- Don't run ts check or Convex TypeScript check on every task. Only run on big planned task.

### Operating rule
- At the start of each assistant turn: read `CONTINUITY.md` before acting.
- Update `CONTINUITY.md` only when there is a meaningful delta in: Goal/success criteria, Invariants/constraints, Decisions, State (Done/Now/Next), Open questions, Working set, or important tool outcomes.

### Keep it bounded (anti-bloat)
- Keep `CONTINUITY.md` short and high-signal:
  - `Snapshot`: ≤ 25 lines.
  - `Done (recent)`: ≤ 7 bullets.
  - `Working set`: ≤ 12 paths.
  - `Receipts`: keep last 10–20 entries.
- If sections exceed caps, compress older items into milestone bullets with pointers (commit/PR/log path/doc path). Do not paste raw logs.

### Anti-drift rules
- Facts only, no transcripts.
- Every entry must include:
  - a date or ISO timestamp (e.g., `2026-01-13` or `2026-01-13T09:42Z`)
  - a provenance tag: `[USER]`, `[CODE]`, `[TOOL]`, `[ASSUMPTION]`
- If unknown, write `UNCONFIRMED` (never guess). If something changes, supersede it explicitly (don't silently rewrite history).

### Decisions and incidents
- Record durable choices in `Decisions` as ADR-lite entries (e.g., `D001 ACTIVE: …`).
- For recurring weirdness, create a small, stable incident capsule (Symptoms / Evidence pointers / Mitigation / Status).

### Plan tool vs ledger
- Use `update_plan` for short-term execution scaffolding (3–7 steps).
- Use `CONTINUITY.md` for long-running continuity ("what/why/current state"), not micro task lists.
- Keep them consistent at the intent/progress level.

### In replies
- Start with a brief "Ledger Snapshot" (Goal + Now + Next + Open Questions).
- Print the full ledger only when it materially changed or the user requests it.