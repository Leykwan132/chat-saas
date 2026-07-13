# Dashboard Support Hover Card Design

## Goal

Add a support control beside the dark-mode control in the authenticated dashboard and workspace headers. The control gives users direct access to bug reporting, WhatsApp support, and email support without adding support UI to public, blog, or legal headers.

## Placement

Render one reusable `SupportHoverCard` immediately beside `ModeToggle` in:

- `DashboardHeader` in `src/layouts/DashboardLayout.tsx`
- `WorkspaceShell` in `src/pages/WorkspacePage.tsx`

The control follows the existing desktop-only visibility of `ModeToggle`. No public-site header is changed.

## Trigger and Interaction

The trigger is a ghost icon button using Lucide's `MessageCircleQuestionMark`. Its size, round shape, focus treatment, and hover treatment match the existing dark-mode button.

The HoverCard supports its normal pointer-hover behavior and opens immediately when the trigger is clicked. It closes after a support option is selected. The trigger has an accessible `Contact support` label.

## Content

The HoverCard follows the established workflow template picker pattern: a compact heading followed by three fully clickable small Cards in a three-column grid.

Each Card contains an icon, title, short description, and trailing action cue:

1. `Report a bug` uses a Lucide bug icon and opens `https://forms.gle/Hoo56T7Qj3yEBEeZ9` in a new tab.
2. `WhatsApp support` uses `SiWhatsapp` and opens `https://wa.me/60129499394` in a new tab.
3. `Email support` uses a Lucide mail icon and opens `mailto:support@kilobot.app` in the user's mail client.

The web destinations use `target="_blank"` with `rel="noreferrer"`. The email destination stays in the current browsing context so the operating system can launch the configured mail client.

## Component Boundaries

`SupportHoverCard` owns its open state, support-option metadata, trigger, and cards. Dashboard and workspace headers only decide where the component appears. This avoids duplicated card markup and keeps support destinations in one module without coupling support behavior to `ModeToggle`.

No backend calls, persistence, analytics, or error state are required. Link handling remains native so failures are visible to the browser or operating system rather than hidden behind a fallback.

## Accessibility

Each support Card is rendered as a semantic anchor through the existing Card composition, making the full surface directly clickable and keyboard reachable without custom key handlers. Visible focus styling matches the workflow template cards. Icons are decorative; the trigger and links provide accessible text.

## Testing

Use a focused source-level test to establish the feature before implementation. It verifies:

- the three exact destinations and their appropriate target behavior;
- the requested trigger and option icons;
- the three-column, fully clickable Card composition;
- placement before `ModeToggle` in dashboard and workspace headers;
- absence from public, blog, and legal header modules.

Run the focused test under Node 22, followed by targeted ESLint, `git diff --check`, and touched-code LOC checks. A broader TypeScript build is unnecessary for this isolated UI composition unless focused verification exposes a type issue.
