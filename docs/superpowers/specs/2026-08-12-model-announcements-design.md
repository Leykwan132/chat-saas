# Model Announcements and Scorecards Design

## Goal

Give authenticated users a compact announcement experience and clearer model-selection guidance while preserving the refreshed paid model catalog.

## What’s new interaction

- Render an outlined `What’s new` header button with Lucide’s `Package` icon before the support control.
- Clicking the button opens one accessible modal. Hovering does not open it.
- The modal follows the supplied reference: `What’s new in Kilobot` heading, white surface, roomy announcement rows, icons, titles, optional `New` badges, summaries, and right-side disclosure affordances.
- Render `https://storage.kilobot.app/dashboard/new%20feature%402x.png` as a full-width, 4:1 cropped banner above the modal heading. Preserve the modal corner radius and use `object-cover`; this makes the banner 40% shorter than the earlier 12:5 treatment.
- Announcements render in a bounded ScrollArea as a single-open Accordion.
- Clicking an announcement expands its Accordion item and shows the full detail list inline.
- Closed announcement rows show a right-pointing chevron. The same chevron rotates down only while its row is expanded; shared Accordion indicators elsewhere remain unchanged.
- Remove the intermediate Popover, `View full update` action, and secondary announcement detail Dialog.
- The first announcement is `Model support update` and uses a scan-friendly list that states: GPT-OSS 120B and Qwen3.7 Flash introduce a new 0.5-credit-per-message tier; NVIDIA Nemotron 3.5 Lightning is new at one credit per message; GPT-5.6 Luna is new at two credits per message; DeepSeek V4 Flash remains available at one credit per message; Amazon Nova Micro and Google Gemini 3.1 Flash Lite are removed.
- The first announcement uses Lucide’s `Orbit` icon as the installed asteroid-style symbol, displays `12 Aug 2026` from its structured ISO announcement date, and renders its `New` badge with a subtle neutral background and border.
- Announcement data remains local and structured for future additions. No read state or backend persistence is introduced.

## Model scorecards

- Add a typed `MODEL_SCORECARDS` record keyed by every enabled model ID.
- Each scorecard contains an overall 1–5 Kilobot editorial rating, Quality, Speed, Reasoning, and Value scores, explicit language strengths, and one concise `bestFor` statement.
- Ratings are Kilobot recommendations, not customer reviews or external benchmark claims.
- Language strengths use `Primary`, `Strong`, and `Supported` labels and explicitly cover Malay, Chinese, and English where applicable.
- Hovering or focusing a model row in the selection Dialog opens a shadcn HoverCard.
- The HoverCard uses `@smastrom/react-rating` in read-only mode for the overall score, compact text rows for the four supporting metrics, language badges, and the `bestFor` statement.
- The read-only rating uses `StickerStar` with active fill `#f59e0b` and inactive fill `#ffedd5`, preserving its 120px maximum width and visible numeric score.
- The selection row remains clickable and inaccessible models keep their existing upgrade behavior.

## Scorecard identity header

- Add a top identity row to every model scorecard HoverCard with the model’s existing 16px provider icon and semibold display name.
- Place the existing `Kilobot rating` row immediately below the identity row, followed by the rating stars, metrics, language fit, and best-for guidance.
- Pass the current model label, chef slug, and optional image URL from `ModelPickerItem` into `ModelScoreHoverCard` rather than duplicating catalog identity in the scorecard record.
- Render the icon through `ModelSelectorLogo` so Qwen uses LobeHub’s colored Qwen icon and every other provider preserves its current image behavior.
- Unknown historical models continue returning the picker row without an empty HoverCard.

## Initial scorecards

| Model | Overall | Quality | Speed | Reasoning | Value | Language strengths | Best for |
|---|---:|---:|---:|---:|---:|---|---|
| Ilmu Mini V3.3 | 3.0 | 3.0 | 4.0 | 2.5 | 5.0 | Malay Primary, English Supported | Free Malay-first conversations |
| Xiaomi MiMo V2.5 | 3.5 | 3.5 | 4.0 | 3.5 | 4.0 | Chinese Primary, English Strong | General-purpose Chinese conversations |
| DeepSeek V4 Flash | 4.0 | 4.0 | 4.0 | 4.0 | 4.0 | Chinese Strong, English Strong | Balanced everyday support |
| OpenAI GPT-OSS 120B | 3.5 | 3.5 | 3.5 | 4.0 | 5.0 | English Primary | Budget-friendly reasoning |
| OpenAI GPT-5.6 Luna | 4.5 | 4.5 | 3.5 | 4.5 | 3.0 | English Primary, Chinese Supported | Strongest overall performance |
| NVIDIA Nemotron 3.5 Lightning | 4.0 | 4.0 | 5.0 | 4.0 | 4.0 | English Primary | Fast English responses |
| Qwen3.7 Flash | 4.0 | 4.0 | 4.5 | 4.0 | 5.0 | Chinese Primary, English Strong | Fast Chinese conversations |

## Qwen branding

- Render LobeHub’s `Qwen.Color` component from the shared model-selector logo component whenever the provider slug is `qwen`.
- Reuse that shared rendering path in both the selected-model trigger and model rows so Qwen branding stays consistent.
- Remove the local Qwen SVG and Qwen-specific `imageUrl`; all other providers retain their existing image and models.dev behavior.
- Keep the model ID, provider, chef, and chef slug unchanged.

## Accessibility and layout

- Dialog and HoverCard triggers use `asChild` with existing interactive controls.
- Accordion triggers expose their expanded state and support keyboard activation.
- Dialog content retains a visible title and description.
- Rating is read-only and accompanied by visible `x.x / 5` text.
- The Dialog list is bounded and scrollable on small viewports.
- The banner keeps its 4:1 crop on narrow viewports, caps at `21dvh`, and does not force the announcement list below the viewport.

## Verification

- Model scorecard tests assert complete enabled-model coverage, score bounds, language labels, and the initial editorial values.
- Model picker tests assert each row is wrapped in the scorecard HoverCard and the Rating package is read-only.
- Model scorecard tests assert the visible identity header contains the supplied model name and the shared provider icon.
- Model scorecard tests assert the Rating uses `StickerStar`, the approved amber fills, and remains read-only.
- Announcement tests assert Package-icon button copy, the supplied banner, click-open Dialog, formatted announcement date, neutral `New` badge, right-to-down chevron behavior, single Accordion behavior, and inline expanded detail content with no secondary action or Dialog.
- Model-selector tests assert Qwen uses LobeHub’s colored component and other providers retain their existing image behavior.
- Run focused Vitest, scoped ESLint, Node 22 TypeScript, production build, and `git diff --check`.

## Release state

Production availability remains unconfirmed. The public changelog is unchanged until the release date is confirmed. The existing Gemini-to-DeepSeek migration must still run before catalog removal is deployed.
