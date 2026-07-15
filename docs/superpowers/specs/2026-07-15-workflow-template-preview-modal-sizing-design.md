# Workflow Template Preview Modal Sizing Design

## Goal

Show more of the WhatsApp template preview when selecting Reminder and Follow-up messages by enlarging both selection dialogs by approximately 30% on sufficiently large screens.

## Scope

- Enlarge `WorkflowReminderMessageDialog` from a 980px by 720px desktop target to 1,274px by 936px.
- Enlarge `WorkflowFollowupMessageDialog` from a 980px by 760px desktop target to 1,274px by 988px.
- Preserve the existing 2rem viewport margin on narrower or shorter screens.
- Preserve the existing header, footer, template picker, phone-preview scale, and confirmation behavior.
- Apply the change to the Follow-up strategy stage and configuration stage because they share one dialog shell.

## Layout

Each dialog continues to use the existing responsive width and maximum-height constraints. The desktop width cap becomes 1,274px, while the requested height becomes 936px for Reminder and 988px for Follow-up. The existing `calc(100vw - 2rem)` width and `calc(100vh - 2rem)` height boundaries remain authoritative whenever the viewport is smaller than those targets.

The two-column configuration layout remains unchanged. Additional height gives the existing phone preview enough room to display more of its frame without enlarging the phone itself or introducing a second outer scrollbar. The preview keeps its internal scrolling for templates whose content exceeds the simulated WhatsApp viewport.

## Behavior and Accessibility

No selection, persistence, keyboard, focus, or dialog-close behavior changes. Existing shadcn Dialog title and description elements remain intact. The dialog stays centered and viewport-safe through the current Dialog primitive and responsive constraints.

## Testing

- Add source-level regression assertions for both dialog desktop width and height targets.
- Assert that both dialogs retain the 2rem viewport width and height constraints.
- Run the focused Reminder and Follow-up dialog tests first.
- Run targeted lint, the complete test suite, the production build, and `git diff --check` before completion.

## Non-goals

- Changing the reusable WhatsApp preview dimensions or typography.
- Removing the phone preview's internal scrolling.
- Changing template selection, confirmation, or workflow data.
- Modifying template previews outside the Workflow Reminder and Follow-up dialogs.
