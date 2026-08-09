# Agent Creation Identity Validation Design

## Context

The first agent-creation step currently disables Continue until both required fields are complete. A disabled control cannot explain what is missing when a user tries to proceed. The page also uses a long heading and unnecessary helper copy beneath the optional business description.

## Approved interface

The first step uses the heading `Let’s set up your agent`.

The required labels render as:

- `Agent name *`
- `Business name *`

The asterisk uses the destructive red text token so it is visually clear and remains hidden from assistive technology. Each required input retains its native required semantics.

The optional business-description label remains unchanged. Its textarea starts at five rows for slightly more writing space. The helper sentence `A short description helps the agent give more relevant answers.` is removed.

## Validation behavior

Continue remains clickable when required values are missing. Submitting the form validates trimmed Agent name and Business name values.

For each missing value, the form:

- marks the related input invalid;
- shows an inline alert beneath that input;
- associates the alert with the input; and
- focuses the first missing input.

The messages are:

- `Enter an agent name.`
- `Enter a business name.`

An error clears when its input receives a nonblank value. When both values are valid, submission continues to the goal step exactly as it does today.

## Implementation boundaries

The change is limited to the identity step and its focused tests. It does not change the creation payload, Convex schema, prompt builder, goal selection, existing agents, or post-creation routing.

## Verification

Focused coverage must prove:

- the shorter heading and required markers render;
- the removed helper sentence does not render;
- missing-field validation returns the correct messages and first field;
- Continue is not disabled when fields are blank; and
- valid identity values still advance normally.
