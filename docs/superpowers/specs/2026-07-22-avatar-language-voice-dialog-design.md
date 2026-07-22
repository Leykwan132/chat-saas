# Avatar Language and Voice Dialog Design

## Goal

Replace free-text language entry and the native voice selector with provider-backed language selection and a dialog that supports inline voice previews. Preserve portrait avatar artwork without changing the horizontal embed orientation.

## Provider Catalog

- Fetch `GET /v1/languages` server-side alongside public avatars and public voices.
- Map each provider language to `{ code, name }`, where `code` is the ISO language code and `name` is the provider display name.
- Return languages through the existing protected Avatar setup catalog action. The LiveAvatar API key never reaches the browser.
- Validate embed creation against a freshly loaded catalog: the language code must exist and the selected public voice must have the same language code.
- Continue sending the chosen code as Embed V2 `default_language` and Full Mode `avatar_persona.language`.
- Keep the existing Convex Agent call, prompt, tools, thread, and billing path unchanged.

## Language Selection

- Render Language before Voice on the voice step.
- Use the installed shadcn Select so each option and the closed trigger can display a flag, language name, and uppercase language code.
- Use the installed `flag-icons` package for country flags.
- Derive a representative ISO country code with `new Intl.Locale(languageCode).maximize().region`.
- Render a neutral globe icon for `multi`, invalid codes, or codes without a derived region.
- Changing language stops active preview audio and clears the selected voice when it is not compatible with the new language.
- The voice field remains disabled until a language is selected.

## Voice Picker Dialog

- Replace the native voice select with a field-like button that displays the selected voice or `Select a voice`.
- Clicking the field opens a shadcn Dialog titled `Choose a voice`.
- Show only public voices whose language exactly matches the selected language code.
- Each row displays the voice name plus available description and gender details.
- The complete row selects the voice, stops playback, and closes the dialog.
- A trailing play icon is always visible. Hover and keyboard focus reveal clear circular button chrome without shifting the row.
- Clicking the trailing control does not select the row. It loads and plays that voice preview.
- Clicking the active control again pauses playback. Clicking another preview stops the current audio before starting the next one.
- Replace the play icon with a pause icon while audio is active and show a loading state while its preview is fetched.
- Closing the dialog, selecting a voice, changing language, navigating back, or unmounting stops playback and invalidates pending preview requests.
- Cache fetched preview audio for the current page session.
- Remove the separate bottom Preview voice action. The bottom action row contains only Save changes or Create embed link.
- Show the shared Empty presentation inside the dialog when the selected language has no public voices.

## Component Boundaries

- `AvatarCreatePage` owns the catalog, selected avatar, selected language, selected voice, and embed creation.
- `AvatarVoicePickerDialog` owns dialog visibility, preview fetching, audio playback, page-local preview caching, and cleanup.
- `AvatarLanguageFlag` owns language-to-region derivation and flag/globe presentation.
- `AvatarPreviewMedia` owns consistent avatar image fitting for the grid and selected-avatar summary.
- Shared Avatar option types include a `LanguageOption` with `code` and `name`.
- Components remain below the workspace 300-line limit.

## Portrait Avatar Media

- Keep avatar grid tiles and the selected-avatar summary in horizontal 16:9 frames.
- Render provider preview images with `object-contain` against a neutral dark media background so portrait and landscape artwork stays fully visible.
- Keep Embed V2 orientation fixed to `horizontal`; portrait source artwork does not change the generated embed aspect ratio.

## Error Handling

- Catalog failures continue using the existing setup error presentation.
- Preview failures stop playback and display the provider error through the existing toast pattern.
- An unavailable or incompatible language/voice combination is rejected server-side before context or embed creation.
- No raw audio, video, provider credentials, avatar IDs, or voice IDs are exposed as user-editable values.

## Verification

- Provider tests cover language mapping, catalog inclusion, and exact language/voice compatibility validation.
- UI contracts cover language-before-voice ordering, flag-icons usage, the dialog trigger, filtered voices, row selection, inline play/pause behavior, removal of the bottom preview action, and portrait-safe `object-contain` media.
- Preview tests cover one active voice, second-click pause, switching voices, cached audio, stale request invalidation, and dialog/unmount cleanup.
- Run focused Avatar tests, scoped ESLint, Convex TypeScript, the TypeScript/Vite production build, file-length checks, and `git diff --check` under Node.js 22.

## Boundaries

- Avatar billing remains out of scope.
- Custom and photo-generated avatars remain out of scope.
- The final embed remains horizontal 16:9.
- LiveAvatar remains in Full Mode with sandbox behavior unchanged.
