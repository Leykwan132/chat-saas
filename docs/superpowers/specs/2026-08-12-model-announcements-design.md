# Model Refresh and Announcements Design

## Goal

Refresh the supported model catalog and give dashboard users a visible, scrollable What’s new announcement modal.

## Model catalog

- Remove Google Gemini 3.1 Flash Lite from all current selectable, dashboard-supported, preview, upgrade, and Agent Setup surfaces, and migrate existing Gemini-configured agents to DeepSeek V4 Flash.
- Reintroduce paid OpenAI GPT-OSS 120B as a budget-friendly Advanced/Latest model for Starter, Growth, and Business.
- Keep DeepSeek V4 Flash and NVIDIA Nemotron 3.5 Lightning at one credit per message.
- Set Qwen3.7 Flash and OpenAI GPT-OSS 120B to 0.5 credits per message.
- Set OpenAI GPT-5.6 Luna to two credits per message.
- Keep Qwen, NVIDIA, and Luna available to Starter, Growth, and Business with their existing Advanced and Latest labels.

## What’s new

- Add an announcement trigger beside the authenticated-header support trigger.
- Open an accessible centered dialog when the trigger is clicked.
- Render announcement data from a dedicated local module so future updates add data rather than UI logic.
- Put the announcement list in a bounded `ScrollArea`.
- Add the first entry, “New, more capable AI models,” with guidance to use Qwen3.7 Flash for fast Chinese conversations, NVIDIA Nemotron 3.5 Lightning for faster English responses, and GPT-5.6 Luna for slightly stronger performance.

## Compatibility

The announcement feed is local and does not persist read state. Existing historical model usage labels remain unchanged. Production availability is unconfirmed, so the public release changelog remains unchanged.

## Verification

Pricing and plan tests will assert the removal and credit costs. Component and authenticated-header tests will assert the announcement trigger, dialog semantics, scroll area, and first announcement content. Run focused Vitest tests, Docs TAP tests, scoped ESLint, TypeScript, production build, and `git diff --check` under Node 22.
