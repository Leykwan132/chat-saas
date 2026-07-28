# AI Agent Usage Card Reset Date Design

## Goal

Make the AI Agent Usage card more useful by replacing the redundant plan-status sentence with the next credit-reset date and slightly reducing the visual size of the exact credit balance.

## Presentation

- Keep the card title as the current plan name, such as `Business plan`.
- Replace `You are on Business plan` with a concise localized date such as `Resets Aug 4`.
- Use the existing `periodEndMs` credit-cycle boundary returned by `getPlanAndUsage`.
- Keep the exact balance wording: `12,450 of 15,000 credits`.
- Reduce the remaining balance from `text-2xl` to `text-xl`.
- Render `of 15,000 credits` as smaller muted text while keeping it inline.
- Preserve the current rows, progress bars, and warning colors.
- Replace `More credits` with a `Manage plan` outline action using a settings icon.
- Route the action to Settings → Plan without the add-ons anchor.

## Boundaries

This change does not alter Stripe billing periods, analytics filters, credit deductions, reset scheduling, or backend queries.

## Verification

A focused source contract will assert that the card formats the local reset date from `periodEndMs`, removes the redundant plan-status copy, preserves exact locale-formatted values, and uses the smaller typography classes.
