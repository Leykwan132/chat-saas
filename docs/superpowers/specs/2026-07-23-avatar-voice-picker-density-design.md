# Avatar Voice Picker Density Design

## Goal

Make the Avatar voice picker faster to scan by presenting voices in two columns, making preview controls visually discoverable, and increasing the selected-avatar preview by approximately 30%.

## Layout

- Increase the voice dialog's desktop maximum width from the current large size to a comfortable two-column width.
- Render compatible voices in one column on viewports narrower than 480px and two columns at 480px and wider.
- Keep the existing scroll boundary so long provider catalogs remain contained inside the dialog.
- Preserve the current borderless voice rows, typography, truncation, and click-anywhere selection behavior.

## Preview Control

- Keep one circular shadcn Button for previewing each voice.
- Use the semantic secondary treatment so the control always has a visible neutral background.
- Preserve the existing loading spinner, play icon, pause icon, accessible label, one-at-a-time playback, caching, and error toast behavior.
- Give the actively playing control a stronger semantic state without introducing raw color values.

## Selected Avatar

- Increase the selected-avatar preview from 208px to approximately 270px wide.
- Retain the existing 16:9 frame, contained portrait artwork, rounded corners, and adjacent avatar name.
- Allow the summary to remain responsive so it does not overflow narrow screens.

## Scope

This is a presentation-only refinement. Voice compatibility filtering, voice selection, preview requests, audio caching, playback coordination, Avatar creation, and backend behavior remain unchanged.

## Verification

- Add a source contract for the responsive two-column grid, wider dialog, semantic preview-button background, active preview state, and approximately 270px avatar width.
- Run the focused Avatar setup and voice-dialog tests.
- Run scoped ESLint, the production build, file-length checks, and whitespace validation under Node.js 22.
