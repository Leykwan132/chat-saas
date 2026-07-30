# Quick Start Next Steps Copy Design

## Goal

End Quick Start with a lightweight paragraph similar to the React documentation instead of three large cards.

## Approved presentation

Replace `Choose what to do next` and its three `DocCard` components with:

```mdx
## Next steps

Your agent is ready! Continue by [deploying it to channels](/channels/connect-channels), [setting up workflows](/automate/workflow-overview), or [setting up bookings](/bookings/services).
```

The three existing destinations remain available, but the ending reads as one natural sentence.

## Cleanup

Remove the unused `DocCard` import from Quick Start. Do not change the three required setup steps, media placeholders, success criteria, sidebar, or page-outline styling.

## Verification

Update the focused onboarding contract to require:

- The `Next steps` heading.
- The exact three inline labels and destinations.
- No `DocCard` import or rendered card markup in Quick Start.
- The existing three-step onboarding journey.

Run the focused contract, complete docs test suite, TypeScript check, production build, and a responsive visual check.

## Release status

The documentation remains unreleased. Do not add a public changelog entry or deploy it.
