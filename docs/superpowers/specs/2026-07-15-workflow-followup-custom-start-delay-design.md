# Workflow Follow-up Custom Start Delay Design

## Goal

Allow users to configure a custom Workflow Follow-up **Start after** duration with the same amount-and-unit interaction used by Workflow Reminder timing. The selected value must control the actual scheduler delay and appear consistently in the setup UI and summary.

## Scope

- Add one `Custom` option to **Start after**.
- Support positive whole-number amounts in minutes, hours, days, or weeks.
- Keep the existing Start after presets.
- Keep **Follow up every** unchanged and stored in hours.
- Replace unclear `after no reply` summary wording with `if the customer didn't reply`.

## Interaction

The Start after selector keeps its preset options and adds `Custom` as the final menu item. Selecting Custom opens a compact dialog matching the existing Reminder custom-timing dialog:

- A numeric amount input defaults to the current custom amount or `1`.
- A unit selector offers minutes, hours, days, and weeks.
- Cancel closes the dialog without changing the saved selection.
- Confirm accepts only a positive whole number and atomically selects the custom option and duration.
- Reopening Custom restores the currently selected custom amount and unit.

The closed selector shows a human-readable label such as `15 minutes` or `1 day`. Custom values do not accumulate as additional menu choices.

## Data Model

Follow-up start delay becomes canonical integer minutes so minute-level values are exact. The Follow-up configuration gains:

- `startAfterMinutes`: the scheduler-ready positive integer duration.
- `customStartAfter`: optional serializable metadata containing amount, unit, ID, label, and summary label.

The existing `startAfterHours` field is migrated with a widen-migrate-narrow rollout:

1. Add the new fields while retaining the legacy hours field during the transition.
2. Write canonical minutes for every newly saved configuration.
3. Backfill existing values as `startAfterHours * 60` in bounded migration batches.
4. Verify all stored Workflow Follow-up configurations have canonical minutes.
5. Remove legacy reads and narrow the schema in a later cleanup deploy.

The transition compatibility path is explicit migration handling, not a silent default. A stored configuration with neither a valid legacy value nor canonical minutes fails validation.

## State Flow

Preset and custom selection use a dedicated atomic Follow-up start-delay state action. The action updates together:

- the `startAfter` selection ID;
- `startAfterMinutes`;
- optional custom metadata.

Selecting a preset clears the active custom metadata while preserving no unused custom menu entries. This also fixes the current divergence where changing the visible preset can leave the scheduler's numeric delay unchanged.

## Runtime

Initial outbound scheduling and current-and-future reconciliation use `startAfterMinutes * 60 * 1000`. Retry scheduling continues to use the unchanged `intervalHours` value.

Changing the Start after duration increments the Follow-up configuration revision through the existing save comparison, so normal reconciliation and cancellation behavior continues to apply.

## Presentation

The Follow-up summary sentence becomes:

`This follow-up sends …, starting [duration] if the customer didn't reply …`

The highlighted duration, Starts row, and schedule card use the same normalized human-readable label. Preset labels no longer embed `after no reply`, avoiding duplicated or ambiguous wording.

## Validation and Failure Behavior

- Amount must be a positive integer.
- Canonical minutes must be a positive integer.
- Unit must be minutes, hours, days, or weeks.
- Invalid stored selections or duration metadata fail explicitly.
- Cancel never mutates configuration.

## Verification

- Unit tests for formatting, parsing, minute conversion, and atomic state updates.
- Component regression tests for the Custom menu item, dialog units, confirmation, cancellation, and restored values.
- Summary tests for `if the customer didn't reply` and custom labels.
- Convex tests proving minute-accurate initial scheduling and reconciliation.
- Migration dry run and verification before applying the backfill.
- Focused tests, full Vitest suite, targeted ESLint, production build, `git diff --check`, and touched-code line-count checks under Node v22.
