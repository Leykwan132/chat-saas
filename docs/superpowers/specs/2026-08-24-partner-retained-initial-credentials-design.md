# Partner retained initial credentials

## Purpose

Let an authorized partner retrieve the initial credentials issued for a directly provisioned customer and see whether that customer has completed a password reset. A reset means the initial password is no longer current.

This design supersedes the password-persistence non-goal in `2026-08-24-partner-active-customer-accounts-design.md`. It does not change how the customer signs in or resets a password.

## Scope

- Retain each directly provisioned customer's initial password encrypted at rest.
- Show that credential only after an authorized partner clicks the active customer row.
- Add a Password reset column to the customer table.
- Mark the column as reset only after WorkOS delivers `password_reset.succeeded` for that WorkOS user.
- Retain the current one-time credentials dialog after creation and use ghost icon buttons for copying.
- Leave the organization column left-aligned; the remaining organization-table columns retain their existing alignment.

## Non-goals

- Do not retain or display a password-reset token or the customer's replacement password.
- Do not expose a credential through an overview subscription or a table query.
- Do not mark a password as reset when a reset link is requested; the user must complete the WorkOS flow.
- Do not create a second WorkOS webhook endpoint.
- Do not provide credentials for legacy invitation-backed customers that were not directly provisioned by the partner dashboard.

## Architecture

### Encrypted credential record

Add a dedicated credential table keyed by partner organization and WorkOS user ID. It contains the authenticated-encryption ciphertext, initialization vector, authentication tag, encryption-key version, and timestamps. The initial password itself is never stored as plaintext.

The Node customer-provisioning action generates the password, sends it to WorkOS to create the user, encrypts it with AES-256-GCM, and persists the encrypted values in the same internal persistence operation that creates the active-account relationship. The application reads `PARTNER_INITIAL_CREDENTIALS_ENCRYPTION_KEY` from Convex environment configuration. It must be a base64-encoded 32-byte key; a missing or invalid value fails provisioning rather than creating an unrecoverable customer credential.

The initial-password dialog receives plaintext only from the creation action or from a new partner-authorized credential action. The later action verifies the authenticated partner owns the exact organization and direct customer account, loads the matching credential record, then decrypts it in the Node runtime. It returns no subscription data and does not log the credential.

Removing a customer deletes its encrypted credential record with the account relationship. The existing organization-deletion cleanup removes every credential record for that organization. No password is retained after those deletions.

### Password-reset status

Add an optional `passwordResetAt` timestamp to the direct customer account relationship. Its absence renders `Not reset`; its presence renders `Password has been reset by user`.

The existing signed `/webhook/workos` endpoint already verifies `WORKOS_WEBHOOK_SECRET` and deduplicates `event.id` in `processedEvents`. Its dispatcher gains a `password_reset.succeeded` branch. WorkOS event data for this event is the password-reset resource, including `user_id`; the branch finds direct partner accounts for that user and records the event time as `passwordResetAt`. Replayed deliveries are harmless because the existing event-id deduplication remains the transaction boundary.

No state changes when Profile requests a reset URL. The column changes only after WorkOS confirms completion. The customer-row dialog labels the retained secret `Initial password` while reset is pending and `Initial password — no longer current` once `passwordResetAt` exists.

### Customer table and dialog

The active-customer table adds a compact Password reset column. Rows with an encrypted credential open the credentials dialog on click; action-menu clicks do not open it. The dialog has ghost copy-icon buttons for email and password. It presents the initial password as historical access information after a reset, not as a current login secret.

Legacy pending and accepted invitation rows have no retained initial credentials and do not open the credential dialog. Their reset-status cell remains unavailable rather than implying a password account exists.

## Safety and error handling

- Authorization remains server-side; client-supplied IDs are used only to locate records after ownership verification.
- Encryption, decryption, and key validation run only in a Node action module, never in a Convex query or browser.
- Failed encryption prevents the credential record and direct account relationship from being persisted; existing WorkOS rollback behavior remains in place.
- Missing encrypted data renders credentials unavailable instead of returning an invented fallback.
- An invalid ciphertext or missing key fails the authorized retrieval action without exposing partial secret material.
- The current WorkOS webhook signature verification and duplicate-event handling remain mandatory before any reset status is written.

## Verification

- Unit coverage proves the stored credential is encrypted, not plaintext, and only an authorized partner action can decrypt it.
- Coverage proves removing a customer or organization removes its credential record.
- Webhook tests prove `password_reset.succeeded` sets `passwordResetAt`, while reset-link creation does not.
- UI tests prove the reset column states, row-to-dialog behavior, unavailable legacy rows, historical-password label, ghost copy buttons, and menu click isolation.
- Run focused tests, Convex code generation, Node 22 TypeScript, targeted lint, Vite build, and diff validation.
