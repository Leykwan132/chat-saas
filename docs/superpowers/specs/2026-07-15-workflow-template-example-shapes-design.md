# Workflow Template Example Shapes Design

## Goal

Allow Workflow Reminder and Follow-up drafts to save valid WhatsApp template snapshots whose components use any supported Meta example shape, while continuing to reject malformed or unknown example objects.

## Root Cause

The workflow snapshot validator currently models every component `example` as a BODY named-parameter object requiring `body_text_named_params`. Meta returns different example objects for different component kinds. A media HEADER returns `header_handle`, so a valid selected Follow-up template reaches `workflowDraftSave.save` and fails argument validation before the mutation handler runs.

## Supported Shapes

The workflow snapshot contract will use a strict union of these example objects:

- `{ header_handle: string[] }` for IMAGE, VIDEO, and DOCUMENT headers.
- `{ header_text: string[] }` for positional text headers.
- `{ header_text_named_params: Array<{ param_name: string; example: string }> }` for named text headers.
- `{ body_text: string[][] }` for positional body variables.
- `{ body_text_named_params: Array<{ param_name: string; example: string }> }` for named body variables.

Each union branch accepts exactly one known Meta shape. The implementation will not use an arbitrary record, optional fields within one broad object, or a fallback branch.

## Contract Boundaries

`shared/workflowAutomations.ts` will export the reusable TypeScript example union used by workflow snapshot components. The frontend workflow-template type will reference the same shared union instead of independently declaring a BODY-only example. `convex/workflowAutomationValidators.ts` will mirror that union with strict Convex validators.

The existing template selection and save data flow remains unchanged: selected template components are preserved as a snapshot and sent to `workflowDraftSave.save`. No normalization removes or rewrites Meta example data.

## Compatibility

Existing snapshots with `body_text_named_params` remain valid. Templates without an `example` remain valid because the component field stays optional. Valid header and positional examples become accepted. Unknown keys, wrong array nesting, non-string handles, and malformed named parameters remain rejected by Convex argument validation.

No stored-data migration is required because this error prevents affected drafts from being saved; it does not create an incompatible stored representation.

## Testing

The existing workflow draft save regression will be extended with the reported Follow-up `sameTemplate` media HEADER shape and will assert that `header_handle` persists unchanged. The current named BODY example assertion remains in place to prevent regression.

A validator-focused regression will cover the complete supported union and an invalid example object. Verification will include focused tests, Convex code generation, targeted lint, the complete test suite, the production build, diff checks, and touched-code line counts under Node v22.
