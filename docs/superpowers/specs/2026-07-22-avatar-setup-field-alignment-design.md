# Avatar Setup Field Alignment Design

## Goal

Make the Language and Voice controls in Avatar setup look like one coordinated pair and use product-oriented wording for the first-time action.

## Design

- Language and Voice use the same 40px height, full width, outlined border, rounded shape, background, font size, and horizontal padding.
- The Language selector keeps its flag, friendly language name, and uppercase code.
- The Voice control keeps opening the existing picker dialog with inline previews.
- First-time setup uses the button label `Create avatar`.
- Editing an existing configuration continues to use `Save changes`.
- The selected-avatar summary uses a 208px-wide 16:9 preview, increased from 144px, with its label and avatar name retained beside it.
- Loading skeletons retain the same field and action dimensions.

## Scope

This is presentation and copy only. Provider catalogs, selected values, validation, Embed V2 creation, sandbox behavior, and the Convex Agent flow remain unchanged.

## Verification

- Add a source contract requiring the shared field classes on both controls.
- Require `Create avatar` and reject `Create embed link` in setup.
- Require the selected-avatar preview to use the 208px width contract.
- Run focused Avatar setup tests, scoped lint, and the production build.
