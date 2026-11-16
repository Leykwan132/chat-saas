# Human Escalation navigation and switch

2026-11-15 [USER] Approved General and Human Escalation sub-tabs inside Instructions. Requested Human Escalation itself be a switch, hiding all details when off, and removing the extra container to match existing design language.

Use existing Tabs with an Overview-style pill variant, and plain sections/headings/fields. General contains existing prompt and response configuration; Human Escalation contains the heading, description and master switch, followed by rules and Auto de-escalation only while enabled. Keep the playground available alongside either tab. Remove the card wrapper.

Persist an optional workflow-level master flag. Existing configurations without a flag retain their current enabled state; agents without escalation rules start off. Enabling creates one default rule if none exists using the existing workflow mutation. Disabling preserves rules and existing escalated chats; it prevents new keyword/model/tool handoffs, including in-flight handoff attempts. Previously scheduled resolution of existing escalations is unchanged. Re-enabling restores saved rules. Keep one base rule while enabled; users can remove extra rules.

Keep the runtime engine and existing settings APIs. Gate workflow runtime context, immediate keyword matches and final escalation persistence with the master flag. Authenticate the new setting mutation. No production deployment; refresh development for the user's ongoing local test.

2026-11-15 [USER] Additional requirement: the section is collapsible and expands on click. [CODE] Enabled sections start collapsed; the heading is an accessible expansion button, independent of the master switch. Disabling collapses it. Existing Collapsible primitive handles keyboard and ARIA behavior.

2026-11-15 [USER] CORRECTION supersedes the sub-tab layout: place the collapsible Human Escalation section directly beneath Instructions. Keep the master switch, plain styling and preserved drafts; remove all added sub-tabs.

2026-11-15 [USER] Latest layout supersedes prior placement choices: three Configuration tabs, Instructions / Model & Style / Human Escalation. [CODE] Reply timing/audience stay under Instructions. Preserve existing save behavior and mounted drafts; playground remains shared.

2026-11-15 [USER] Latest adjustment: remove the collapse interaction from the dedicated Human Escalation tab. Show its details immediately when enabled. Preserve the master switch and hidden-but-mounted drafts while disabled.

2026-11-15 [USER] Instructions must contain only instructions. Move the AI reply settings (timing and audience) to Model & Style.

2026-11-15 [USER] Configuration tabs use Overview-style rounded selection highlights, with dark active text and lighter inactive text.
