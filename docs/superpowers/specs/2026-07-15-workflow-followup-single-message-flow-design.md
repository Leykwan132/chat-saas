# Workflow Follow-up Single-message Flow Design

## Goal

Remove the unnecessary Same-message versus Different-messages decision when a Workflow Follow-up has exactly one maximum attempt.

## Scope

- Apply the simplified flow to every `WorkflowFollowupMessageDialog` entry point.
- Open the template-picker stage immediately when maximum attempts is one.
- Treat a one-attempt selection as the Same-message strategy.
- Hide the strategy cards and Back action for one attempt.
- Preserve the existing strategy screen and navigation when maximum attempts exceeds one.

## Dialog State

The dialog derives whether it is a single-attempt flow from the existing Follow-up summary. For one attempt, its initial stage is `configure` and its pending strategy is `same`, regardless of the saved multi-attempt strategy. For multiple attempts, the supplied `initialStage` and saved strategy continue to control the dialog exactly as they do now.

If a configuration was previously using Different messages before its maximum was reduced to one, the first configured attempt template becomes the pending single template. This preserves the message that would have been sent for the only remaining attempt. No saved configuration changes until Confirm is selected.

Confirm persists the Same-message strategy and the selected single template. Closing or cancelling restores pending state without mutating the saved configuration. The reset path must reapply the one-attempt flow so reopening the dialog cannot expose the strategy screen.

## Presentation

The one-attempt configuration stage uses the singular title and description. It contains the existing template picker, WhatsApp preview, and Confirm action. It does not render the strategy cards, numbered attempt selectors, or Back action.

The multi-attempt presentation remains unchanged.

## Testing

- Add focused regressions proving one attempt starts at `configure`, forces the pending Same-message strategy, preserves the first Different-message template, and hides the Back action.
- Preserve the existing assertions for multi-attempt strategy behavior, pending confirmation, modal sizing, and viewport constraints.
- Run the focused dialog test, targeted lint, complete test suite, production build, `git diff --check`, and touched-code line-count checks under Node v22.

## Non-goals

- Changing Reminder message selection.
- Changing Follow-up scheduling or maximum-attempt controls.
- Removing Different messages for two or more attempts.
- Saving strategy or template changes before Confirm.
- Changing the template picker or WhatsApp preview components.
