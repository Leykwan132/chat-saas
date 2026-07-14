# Workflow Template BODY Examples Compatibility Design

## Goal

Allow workflow drafts to save selected WhatsApp templates whose BODY components contain Meta named-parameter examples.

## Root Cause

The template builder and Meta template listing preserve BODY metadata shaped as:

```ts
example: {
  body_text_named_params: Array<{
    param_name: string;
    example: string;
  }>;
}
```

`workflowWhatsappTemplateSnapshotValidator` omits the component-level `example` field, so Convex argument validation rejects the workflow Save before its handler runs. The shared workflow automation type and the workflow template-listing type mirror the same omission.

## Approved Design

- Add a reusable named BODY example validator inside `workflowAutomationValidators.ts`.
- Allow the optional `example` field on workflow template snapshot components using that exact validator.
- Add the same optional structure to the shared and frontend workflow template component types.
- Preserve the metadata unchanged from template selection through workflow Save.
- Do not strip the field and do not weaken validation with `v.any()` or an arbitrary record.
- Apply the compatibility to Reminder templates, Follow-up same-template selections, and Follow-up per-attempt selections through their shared snapshot validator.

## Data Flow

The template builder generates sample values for named BODY parameters. Template listing returns local or Meta components without removing the metadata. Workflow selection snapshots the components, and the Convex workflow Save validator accepts and stores the strictly validated structure.

## Error Handling

Malformed named examples continue to fail Convex argument validation. Only objects containing `body_text_named_params`, with string `param_name` and `example` values, are accepted.

## Verification

- Extend the Convex workflow Save test with a BODY component matching the reported payload.
- Verify the mutation succeeds and the saved reminder template preserves the example object.
- Run the focused workflow Save test and relevant automation validator/history tests under Node 22.
- Run targeted ESLint, `git diff --check`, and touched-code line-count checks.
