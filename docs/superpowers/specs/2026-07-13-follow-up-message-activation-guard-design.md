# Follow-up Message Activation Guard Design

## Goal

Prevent a follow-up from being turned on until every message required by its configured message strategy has a selected WhatsApp template.

## Scope

The guard applies when creating a follow-up with “Start sending follow-ups right away” enabled and when activating an existing follow-up from its detail page. Turning a follow-up off remains unrestricted.

## Message readiness

- “Same message” is ready when its shared template is selected.
- “Different messages” is ready only when every configured follow-up attempt has a selected template.
- An empty template name is treated as missing.

The readiness rule will live in a small shared frontend helper so both activation surfaces use the same definition.

## Interaction

Activation switches remain interactive. If a user tries to turn one on while message readiness is false:

- the switch remains off;
- no activation confirmation opens;
- red inline text appears adjacent to the activation control: `You need to select a message first.`

The warning clears as soon as message readiness becomes true. It does not appear when turning an existing follow-up off.

On the creation page, an invalid attempt to create an active follow-up also keeps the existing create flow from submitting and shows the same inline warning. Creating the follow-up paused remains allowed.

## Backend enforcement

Convex mutations will reject any create, update, or activation request that would persist `isActive: true` with a missing required template. The error will use the same message so non-UI callers cannot bypass the invariant. Existing inactive records with incomplete message selections remain valid until activation is requested.

## Testing

Focused tests will cover:

- shared-message readiness with and without a selected template;
- different-message readiness when one or more attempts are missing templates;
- activation attempts staying off and exposing the inline warning;
- the warning clearing after all required templates are selected;
- paused creation remaining allowed without a selected template;
- Convex create, update, and activation mutations rejecting active incomplete rules.

## Non-goals

This change does not alter message selection, follow-up scheduling, audience filters, confirmation wording, or inactive draft storage.
