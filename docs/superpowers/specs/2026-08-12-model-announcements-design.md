# Model Announcements and Scorecards Design

## Goal

Give authenticated users a compact announcement experience and clearer model-selection guidance while preserving the refreshed paid model catalog.

## What’s new interaction

- Render an outlined `What’s new` header button with Lucide’s `Package` icon before the support control.
- Clicking the button opens one accessible modal. Hovering does not open it.
- The modal follows the supplied reference: `What’s new in Kilobot` heading, white surface, roomy announcement rows, icons, titles, optional `New` badges, summaries, and right-side disclosure affordances.
- Render `https://storage.kilobot.app/dashboard/new-feature.png` as a full-width, 4:1 cropped banner above the modal heading. Preserve the modal corner radius and use `object-cover`; this makes the banner 40% shorter than the earlier 12:5 treatment.
- Announcements render in a bounded ScrollArea as a single-open Accordion.
- Clicking an announcement expands its Accordion item and shows a clean markdown-style release note inline.
- Closed announcement rows show a right-pointing chevron. The same chevron rotates down only while its row is expanded; shared Accordion indicators elsewhere remain unchanged.
- Remove the intermediate Popover, `View full update` action, and secondary announcement detail Dialog.
- The first announcement is `Model support update`. Its expanded content uses one left-aligned text column with the exact heading `New Credit system for Models.` followed by sections titled `New Models`, `Retired Models`, and `Cost of Models`.
- Wrap the complete expanded release note in one softly rounded `bg-muted/40` surface with 20px internal padding and 24px between major sections. Use 8px between each heading and its content. Do not render borders, separate section cards, pills, decorative background circles, or nested content indentation.
- `New Models` lists OpenAI GPT-OSS 120B, Qwen3.7 Flash, NVIDIA Nemotron 3.5 Lightning, and GPT-5.6 Luna with one concise use-case phrase each. DeepSeek V4 Flash remains available but is not described as newly introduced.
- `Retired Models` states that Amazon Nova Micro and Google Gemini 3.1 Flash Lite are no longer available.
- `Cost of Models` groups every available paid model by message cost: GPT-OSS 120B and Qwen3.7 Flash at 0.5 credits/message; DeepSeek V4 Flash and NVIDIA Nemotron 3.5 Lightning at 1 credit/message; GPT-5.6 Luna at 2 credits/message.
- The first announcement uses Lucide’s `Orbit` icon as the installed asteroid-style symbol and renders its `New` badge with a subtle neutral background and border. Its collapsed row omits the date; the final expanded row uses Lucide’s `CalendarDays` followed by `Released on 12 Aug 2026` after a simple top divider.
- Announcement details use structured `newModels`, `retiredModels`, and `modelCosts` data rather than parsing display strings.
- Announcement data remains local and structured for future additions. No read state or backend persistence is introduced.

## Model scorecards

- Add a typed `MODEL_SCORECARDS` record keyed by every enabled model ID.
- Each scorecard contains an overall 1–5 Kilobot editorial rating, Quality, Speed, Reasoning, and Value scores, explicit languages, and a concise two-sentence `description`.
- Ratings are Kilobot recommendations, not customer reviews or external benchmark claims.
- Store only the applicable Malay, Chinese, and English language names for each model. Do not present language fit as a scored or qualitative rating.
- Hovering or focusing a model row in the selection Dialog opens a shadcn HoverCard.
- The HoverCard uses `@smastrom/react-rating` in read-only mode for the overall score, the model identity, two-sentence guidance, compact text rows for the four supporting metrics, and a `Languages` section.
- Render the one-decimal overall score immediately followed by five compact StickerStars as the first row. Remove the `Kilobot rating` label and omit `/ 5` or any review count because these are Kilobot editorial scores rather than customer reviews.
- The read-only rating uses `StickerStar` with active fill `#f59e0b` and inactive fill `#ffedd5`, reducing the star row from its earlier 120px treatment to an 88px width.
- The selection row remains clickable and inaccessible models keep their existing upgrade behavior.

## Scorecard content hierarchy

- Place the rating row first, followed by the model’s existing 16px provider icon and semibold display name.
- Place the model’s two-sentence description immediately below its identity. The first sentence starts with `Best for` and names the primary use case; the second names a secondary strength or practical trade-off.
- Place Quality, Speed, Reasoning, and Value below the description, followed by a `Languages` heading.
- Render every language as plain, readable text beside a green check. Only the check’s small rounded wrapper receives the neutral background; do not place the language text inside a pill or tinted container.
- Pass the current model label, chef slug, and optional image URL from `ModelPickerItem` into `ModelScoreHoverCard` rather than duplicating catalog identity in the scorecard record.
- Render the icon through `ModelSelectorLogo` so Qwen uses LobeHub’s colored Qwen icon and every other provider preserves its current image behavior.
- Unknown historical models continue returning the picker row without an empty HoverCard.

## Initial scorecards

| Model | Overall | Quality | Speed | Reasoning | Value | Languages | Description |
|---|---:|---:|---:|---:|---:|---|---|
| Ilmu Mini V3.3 | 3.0 | 3.0 | 4.0 | 2.5 | 5.0 | Malay, English | Best for free Malay-first customer conversations. It also handles straightforward English support. |
| Xiaomi MiMo V2.5 | 3.5 | 3.5 | 4.0 | 3.5 | 4.0 | Chinese, English | Best for general-purpose Chinese customer conversations. It also supports everyday English interactions. |
| DeepSeek V4 Flash | 4.0 | 4.0 | 4.0 | 4.0 | 4.0 | Chinese, English | Best for balanced everyday customer support. It works well across Chinese and English conversations. |
| OpenAI GPT-OSS 120B | 3.5 | 3.5 | 3.5 | 4.0 | 5.0 | English | Best for budget-friendly reasoning tasks. It provides capable English support at the lowest paid credit tier. |
| OpenAI GPT-5.6 Luna | 4.5 | 4.5 | 3.5 | 4.5 | 3.0 | English, Chinese | Best for conversations that need stronger overall performance. It handles English especially well and can also support Chinese. |
| NVIDIA Nemotron 3.5 Lightning | 4.0 | 4.0 | 5.0 | 4.0 | 4.0 | English | Best for fast English customer conversations. It prioritizes response speed while keeping reasoning balanced. |
| Qwen3.7 Flash | 4.0 | 4.0 | 4.5 | 4.0 | 5.0 | Chinese, English | Best for fast Chinese customer conversations. It also handles everyday English support reliably. |

## Qwen branding

- Render LobeHub’s `Qwen.Color` component from the shared model-selector logo component whenever the provider slug is `qwen`.
- Reuse that shared rendering path in both the selected-model trigger and model rows so Qwen branding stays consistent.
- Remove the local Qwen SVG and Qwen-specific `imageUrl`; all other providers retain their existing image and models.dev behavior.
- Keep the model ID, provider, chef, and chef slug unchanged.

## Accessibility and layout

- Dialog and HoverCard triggers use `asChild` with existing interactive controls.
- Accordion triggers expose their expanded state and support keyboard activation.
- Dialog content retains a visible title and description.
- Rating is read-only and accompanied by its visible one-decimal score.
- The Dialog list is bounded and scrollable on small viewports.
- The banner keeps its 4:1 crop on narrow viewports, caps at `21dvh`, and does not force the announcement list below the viewport.
- All expanded release-note sections share one left edge with no extra `pl-8` indentation.

## Verification

- Model scorecard tests assert complete enabled-model coverage, score bounds, language labels, two-sentence descriptions, and the initial editorial values.
- Model picker tests assert each row is wrapped in the scorecard HoverCard and the Rating package is read-only.
- Model scorecard tests assert the visible rating row precedes the supplied model name and shared provider icon, with the description immediately after the identity.
- Model scorecard tests assert the Rating uses `StickerStar`, the approved amber fills, and remains read-only.
- Model scorecard tests assert the decimal overall score and 88px StickerStar rating share the first flex row, and that both the old `Kilobot rating` label and `/ 5` overall copy are absent.
- Announcement tests assert Package-icon button copy, the supplied banner, click-open Dialog, neutral `New` badge, right-to-down chevron behavior, single Accordion behavior, the four markdown-style headings, exact new/retired model coverage, all three cost groups, one rounded `bg-muted/40` release surface with 20px padding and 24px major-section spacing, absence of nested card or border treatments, consistent left alignment, and a calendar-backed `Released on` row rendered last.
- Model scorecard tests assert each model keeps at least one recognized language name. HoverCard tests assert the `Language fit` section and progress bars are absent, and that `Languages` uses plain text with green checks whose rounded wrappers alone carry the neutral background.
- Model-selector tests assert Qwen uses LobeHub’s colored component and other providers retain their existing image behavior.
- Run focused Vitest, scoped ESLint, Node 22 TypeScript, production build, and `git diff --check`.

## Release state

Production availability remains unconfirmed. The public changelog is unchanged until the release date is confirmed. The existing Gemini-to-DeepSeek migration must still run before catalog removal is deployed.
