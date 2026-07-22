# Avatar Setup Layout Cleanup Design

## Goal

Make the Avatar creation flow visually quieter while reducing avatar selection to one direct action.

## Avatar Step

- The page begins with a compact `Back` action.
- The only introductory content is the heading `Choose your avatar` and one description line: `Select the face visitors will see during a conversation. You can change this later.`
- The progress timeline is removed.
- The outer Card around the avatar options is removed.
- Avatar tiles render directly beneath the description in the existing responsive grid.
- Avatar tiles do not display a selected check icon.
- Clicking an avatar stores that choice and immediately advances to voice selection; there is no Continue action.

## Voice Step

- The voice step uses the same borderless page structure.
- Its only introductory content is `Choose your voice` and one description line explaining preview and later editing.
- Back returns to avatar selection with the previous choice retained so the owner can choose a different avatar.
- The save or embed action remains unchanged.

## Loading and Empty States

- Initial page authorization and configuration loading uses a page-layout Skeleton rather than a centered spinner.
- Avatar catalog loading shows responsive tile Skeletons that match the avatar grid and tile proportions.
- Voice catalog loading shows form-shaped Skeletons matching the voice and language fields.
- A successfully loaded empty catalog continues to use the shared Empty component.

## Boundaries

- No Convex functions, LiveAvatar calls, stored configuration, permissions, or routing behavior change.
- Avatar and voice provider identifiers remain hidden from displayed UI.
- The implementation reuses the installed shadcn Skeleton and Empty components.

## Verification

- A focused source contract verifies the short Back label, the absence of the progress timeline, Card wrapper, Continue action, and selected check icon, direct advancement after avatar selection, retained Back navigation, and Skeleton-based loading states.
- Scoped lint, TypeScript/Vite build, and the existing Avatar tests must pass under Node.js 22.
