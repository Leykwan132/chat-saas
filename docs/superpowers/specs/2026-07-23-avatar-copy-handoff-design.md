# Avatar Copy Handoff Design

## Goal

Make the configured Avatar overview a minimal handoff that tells workspace managers how to install the avatar and gives them one obvious copy action.

## Approved Experience

The configured Avatar page keeps its existing page title, Beta badge, and short product description. An `Edit avatar` outline button appears at the right side of the page header for users with channel-management permission.

Below the header, the page shows one short instruction: `Copy and paste this code into your website to add your avatar.` The generated embed snippet appears directly below it with the existing copy action and success toast.

The configured state does not show:

- An outer Card or extra content border
- A `Website embed` heading
- The avatar iframe preview
- The avatar and voice summary
- An Enabled label, description, or switch

## Layout

The page remains within the existing responsive `max-w-6xl` content container. Its header uses a vertical layout below the `sm` breakpoint and a horizontal, top-aligned, space-between layout from `sm` upward. Title and description stay together; `Edit avatar` appears after them when permitted without introducing a separate bordered surface.

The copy handoff is a plain vertical section. The instruction uses normal body text and the code remains in a muted preformatted surface so the snippet is readable. The copy control remains inside that code surface.

## Component Boundaries

`AvatarPage` owns the page header, permission-aware edit action, configured/empty/loading state selection, and the copy handoff placement.

`AvatarEmbedCard` is narrowed into the configured-state copy handoff. Its public props contain only the embed URL needed to build the snippet. It does not receive agent identity, management permission, configuration enablement, or an enablement callback.

The existing empty state and create flow remain unchanged.

## Behavior and Data Flow

Creating or editing an avatar continues to enable the configuration automatically in the existing backend save mutation. Removing the overview switch does not change backend persistence, public embed resolution, or permission enforcement.

The page no longer calls the update-settings mutation and no longer maintains an optimistic enabled override. Users with `CHANNELS_MANAGE` can reach the existing edit route from the page header. Read-only users see the copy instructions and code but no edit action.

Copying writes the generated embed snippet to the clipboard and retains the `Embed code copied` success toast. Clipboard error handling is unchanged and out of scope.

## Testing

Add a focused source contract for the configured overview that verifies:

- The copy-and-paste instruction and copy action are present
- `Edit avatar` is placed in the page header and remains permission-gated
- `Website embed`, iframe preview, Enabled UI, Switch, Card, and enablement mutation wiring are absent
- The configured handoff no longer accepts enablement or edit-routing props

Run the focused Avatar tests, scoped ESLint, `git diff --check`, and touched-code line-count checks under Node 22.

## Out of Scope

- Changing the generated embed snippet
- Changing Avatar creation or edit fields
- Removing backend enablement fields or mutations
- Changing the public embed runtime
- Deploying the change
