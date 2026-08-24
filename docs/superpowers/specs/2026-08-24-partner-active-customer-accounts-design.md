# Partner active customer accounts

## Purpose

Replace partner-created WorkOS invitations with immediately active customer accounts. A partner creates a new WorkOS user, assigns it to the chosen customer organization, and the customer appears as active in the Partner Programme without accepting an invitation.

Password-based customers can reset their password from Profile without the application seeing, storing, or displaying a password-reset token.

## Scope

- The Partner Programme's Create customer action creates a new WorkOS email-and-password user.
- The user is created with a cryptographically random password and `emailVerified: true`.
- The action creates an active WorkOS organization membership using the role selected by the partner.
- The application persists the partner-to-customer-account relationship, so the customer and organization tables can report a durable active status and customer count.
- Existing WorkOS invitations remain visible as pending or accepted legacy customer records.
- Profile exposes Reset password only for partner-provisioned password accounts.

## Non-goals

- The dashboard never returns, displays, logs, or persists the generated password.
- This change does not alter ordinary WorkOS signup, OAuth, SSO, Magic Auth, or legacy invitation behavior.
- This change does not send a credential email. A new customer sets an initial password through the password-reset flow available on the AuthKit sign-in page.

## Architecture

### Provisioning

`inviteOrganizationAccount` is replaced by a stable, aptly named public action for creating a customer account. It authenticates the partner, validates the selected organization, normalizes the email, and maps the selected role to the existing WorkOS role slug.

The Node action uses `crypto.randomBytes` to generate an unguessable password and includes uppercase, lowercase, numeric, and symbol characters required by the WorkOS password policy. It sends that password only to `workos.userManagement.createUser`, together with the normalized email and `emailVerified: true`. It immediately creates an organization membership with `createOrganizationMembership`; WorkOS marks direct memberships active.

The action persists only non-secret account data through an internal mutation after WorkOS has created both resources. If membership creation fails after the user was created, it deletes that newly created WorkOS user before returning the failure. A duplicate email fails clearly rather than changing an existing user's password or access.

### Persisted account relationship

A new white-label account table represents only partner-provisioned accounts. Each row contains the partner organization ID, WorkOS user ID, normalized email, selected role, active status, and timestamps. It has indexes for the partner organization and WorkOS user ID.

The overview query combines these active account rows with invitation records. The organization customer count includes both sources. The customer table's status column shows active customer accounts with the existing green-dot treatment and legacy pending invitations with the existing yellow-dot treatment.

### Password reset

The profile page queries whether the authenticated WorkOS user has a partner-provisioned password account through the persisted relationship. Only then does it show Reset password.

Selecting Reset password calls an authenticated Node action that verifies that same relationship for the caller, calls `workos.userManagement.createPasswordReset({ email })`, and returns only `passwordResetUrl`. The browser immediately navigates to that WorkOS-hosted URL. The reset token is never written to Convex or rendered in the application.

`getPasswordReset(id)` remains unsuitable for initiating a reset: it only retrieves an already-created reset object.

## User experience

- Create customer becomes "Create customer account" and explains that the account is immediately active.
- On success, its modal closes and a toast states: "Customer account created. They can set a password using Forgot password on the sign-in page."
- Loading keeps the existing inline Spinner and disabled state.
- Customer table heading changes from Invitation status to Status.
- Profile's Reset password action has its own loading state and reports errors without exposing WorkOS details or reset tokens.

## Error handling and safety

- Authorization remains server-side through the existing partner and authenticated-user assertions.
- WorkOS API keys remain read only from the existing server environment variable.
- Invalid email, duplicate email, unavailable organization, failed WorkOS creation, and failed persistence keep the customer dialog open and present the existing error toast.
- A user cannot trigger a reset for another email because the reset action derives the email from the authenticated user and verifies their account relationship.

## Verification

- Unit/source-contract coverage proves that partner provisioning calls WorkOS user creation and direct membership creation, never returns a password, and persists no password field.
- Coverage proves active account rows are merged with legacy invitation rows, with correct counts and status badges.
- Coverage proves the profile reset action is unavailable without the password-account relationship and navigates only to a URL returned by the authorized action.
- Run focused tests, Convex code generation, Node 22 TypeScript, targeted lint, and diff validation.
