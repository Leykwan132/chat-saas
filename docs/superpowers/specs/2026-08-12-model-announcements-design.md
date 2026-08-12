# Model Announcements and Scorecards Design

## Goal

Give authenticated users a compact announcement experience and clearer model-selection guidance while preserving the refreshed paid model catalog.

## What’s new interaction

- Render an outlined `What’s new` header button with Lucide’s `Package` icon before the support control.
- Clicking the button opens a wide, right-aligned Popover. Hovering does not open it.
- The Popover follows the supplied reference: `What’s new in Kilobot` heading, white surface, roomy announcement rows, icons, titles, optional `New` badges, summaries, and right-side disclosure affordances.
- Announcements render in a bounded ScrollArea as a single-open Accordion.
- Expanding an announcement reveals exactly one action, `View full update`.
- The action closes the Popover and opens an accessible full Dialog for that announcement.
- The first announcement is `Model support update` and explains Qwen3.7 Flash for Chinese conversations, NVIDIA Nemotron 3.5 Lightning for fast English responses, GPT-5.6 Luna for stronger performance, and GPT-OSS 120B for budget-friendly reasoning.
- Announcement data remains local and structured for future additions. No read state or backend persistence is introduced.

## Model scorecards

- Add a typed `MODEL_SCORECARDS` record keyed by every enabled model ID.
- Each scorecard contains an overall 1–5 Kilobot editorial rating, Quality, Speed, Reasoning, and Value scores, explicit language strengths, and one concise `bestFor` statement.
- Ratings are Kilobot recommendations, not customer reviews or external benchmark claims.
- Language strengths use `Primary`, `Strong`, and `Supported` labels and explicitly cover Malay, Chinese, and English where applicable.
- Hovering or focusing a model row in the selection Dialog opens a shadcn HoverCard.
- The HoverCard uses `@smastrom/react-rating` in read-only mode for the overall score, compact text rows for the four supporting metrics, language badges, and the `bestFor` statement.
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

- Popover and HoverCard triggers use `asChild` with existing interactive controls.
- Accordion triggers expose their expanded state and support keyboard activation.
- Dialog content retains a visible title and description.
- Rating is read-only and accompanied by visible `x.x / 5` text.
- The Popover and Dialog lists are bounded and scrollable on small viewports.

## Verification

- Model scorecard tests assert complete enabled-model coverage, score bounds, language labels, and the initial editorial values.
- Model picker tests assert each row is wrapped in the scorecard HoverCard and the Rating package is read-only.
- Model scorecard tests assert the visible identity header contains the supplied model name and the shared provider icon.
- Announcement tests assert Package-icon button copy, click Popover, single Accordion behavior, `New` badge, one action, and full Dialog handoff.
- Model-selector tests assert Qwen uses LobeHub’s colored component and other providers retain their existing image behavior.
- Run focused Vitest, scoped ESLint, Node 22 TypeScript, production build, and `git diff --check`.

## Release state

Production availability remains unconfirmed. The public changelog is unchanged until the release date is confirmed. The existing Gemini-to-DeepSeek migration must still run before catalog removal is deployed.
