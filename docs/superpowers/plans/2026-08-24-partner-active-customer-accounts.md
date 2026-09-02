# Partner Active Customer Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Let partners create immediately active WorkOS email-and-password customer accounts, and let those accounts start a secure password reset from Profile.

**Architecture:** A new white-label account relationship persists non-secret membership information after WorkOS creates a user and active membership. The overview merges active rows with legacy invitation rows. A separate authenticated Node action verifies the caller's relationship before returning a one-time WorkOS reset URL to Profile.

**Tech Stack:** Convex, WorkOS Node SDK v9, React 19, TypeScript, shadcn UI, Vitest.

**Spec:** docs/superpowers/specs/2026-08-24-partner-active-customer-accounts-design.md

## Global Constraints

- Use Node v22 for every test, code-generation, lint, and TypeScript command.
- Never persist, return, render, or log a generated password, reset token, or WorkOS API key.
- Generate the initial password with crypto.randomBytes and guaranteed uppercase, lowercase, numeric, and symbol characters.
- Create direct memberships with userManagement.createOrganizationMembership.
- Preserve ordinary WorkOS signup, OAuth, SSO, Magic Auth, legacy invitation behavior, and current uncommitted portal refinements.
- Keep every code file at 300 lines or fewer and do not add explanatory code comments.

---

## File Structure

- convex/schema.ts: white-label active-account table and indexes.
- convex/whiteLabel/customerAccountPassword.ts: random password generator.
- convex/whiteLabel/customerAccounts.ts: account persistence and capability query.
- convex/whiteLabel/customerAccountActions.ts: direct provisioning and reset actions.
- convex/whiteLabel/portalOverview.ts: direct and legacy customer rows.
- src/lib/whiteLabelApi.ts: client action and status type references.
- src/pages/PartnerPage.tsx and src/components/partner/: direct-account UX.
- src/pages/SettingsPage.tsx: conditional reset action.
- Focused Vitest files: source contracts plus password character coverage.

### Task 1: Persist direct customer accounts and merge active rows

**Files:**
- Modify: convex/schema.ts:439-558
- Create: convex/whiteLabel/customerAccounts.ts
- Modify: convex/whiteLabel/portalOverview.ts:1-156
- Modify: src/lib/whiteLabelApi.ts:35-55
- Test: src/pages/PartnerPage.test.ts

**Interfaces:**
- Produces internal.whiteLabel.customerAccounts.persistActiveAccount({ partnerOrganizationId, workosUserId, email, role }) => null.
- Produces whiteLabel.customerAccounts.hasCurrentPasswordAccount({}) => boolean.
- Extends PartnerOverview customer status to pending | accepted | active.

- [ ] **Step 1: Write the failing overview contract**

Add this test to src/pages/PartnerPage.test.ts:

~~~ts
test("merges direct active customer accounts with legacy invitations", () => {
  expect(apiSource).toContain('"pending" | "accepted" | "active"');
  expect(portalOverviewSource).toContain("whiteLabelPartnerOrganizationAccounts");
  expect(portalOverviewSource).toContain('invitationStatus: "active" as const');
  expect(portalOverviewSource).toContain("customerCount: customers.length");
});
~~~

- [ ] **Step 2: Verify it fails**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/PartnerPage.test.ts
~~~

Expected: FAIL because active account data does not yet exist.

- [ ] **Step 3: Add the account relationship and capability query**

Add whiteLabelPartnerOrganizationAccounts with:
~~~ts
{
  partnerOrganizationId: v.id("whiteLabelPartnerOrganizations"),
  workosUserId: v.string(),
  email: v.string(),
  workosOrganizationMembershipId: v.string(),
  role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  status: v.literal("active"),
  createdAt: v.number(),
  updatedAt: v.number(),
}
~~~

Add indexes by_partnerOrganizationId and by_workosUserId. In customerAccounts.ts, persist a normalized email row through an internal mutation. Add this public query:

~~~ts
export const hasCurrentPasswordAccount = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    const account = await ctx.db
      .query("whiteLabelPartnerOrganizationAccounts")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", auth.userId))
      .first();
    return account !== null && account.status === "active";
  },
});
~~~

- [ ] **Step 4: Merge direct rows in the overview**

For every partner organization, query the new table using by_partnerOrganizationId and map rows to:
~~~ts
{
  email: account.email,
  organizationName: team.name,
  role: account.role,
  invitationStatus: "active" as const,
}
~~~

Append existing pending and accepted invitation rows, derive customerCount from the combined array, and extend both Convex and client validators with active.

- [ ] **Step 5: Verify the contract passes**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/PartnerPage.test.ts
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add convex/schema.ts convex/whiteLabel/customerAccounts.ts convex/whiteLabel/portalOverview.ts src/lib/whiteLabelApi.ts src/pages/PartnerPage.test.ts
git commit -m "feat: track active partner customer accounts"
~~~

### Task 2: Create direct WorkOS accounts and password-reset URLs

**Files:**
- Create: convex/whiteLabel/customerAccountPassword.ts
- Create: convex/whiteLabel/customerAccountActions.ts
- Create: convex/whiteLabel/customerAccountPassword.test.ts
- Create: convex/whiteLabel/customerAccountActions.test.ts
- Modify: src/lib/whiteLabelApi.ts:104-117
- Modify: src/pages/PartnerPage.test.ts

**Interfaces:**
- Produces generateInitialCustomerPassword() => string.
- Produces createCustomerAccount({ partnerOrganizationId, email, role }) => { workosUserId: string }.
- Produces startCurrentUserPasswordReset({}) => { passwordResetUrl: string }.

- [ ] **Step 1: Write the failing password test**

Create convex/whiteLabel/customerAccountPassword.test.ts:

~~~ts
import { describe, expect, test } from "vitest";
import { generateInitialCustomerPassword } from "./customerAccountPassword";

describe("generateInitialCustomerPassword", () => {
  test("contains every WorkOS password character class", () => {
    const password = generateInitialCustomerPassword();
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
    expect(password.length).toBeGreaterThanOrEqual(32);
  });
});
~~~

- [ ] **Step 2: Verify it fails**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerAccountPassword.test.ts
~~~

Expected: FAIL because the module is absent.

- [ ] **Step 3: Generate only an unexposed password**

Create convex/whiteLabel/customerAccountPassword.ts:

~~~ts
import { randomBytes } from "node:crypto";

export function generateInitialCustomerPassword() {
  return randomBytes(32).toString("base64url") + "Aa1!";
}
~~~

- [ ] **Step 4: Verify password generation**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerAccountPassword.test.ts
~~~

Expected: PASS.

- [ ] **Step 5: Write failing WorkOS action contracts**

Create convex/whiteLabel/customerAccountActions.test.ts to read the source and assert:

~~~ts
expect(source).toContain("workos.userManagement.createUser");
expect(source).toContain("emailVerified: true");
expect(source).toContain("workos.userManagement.createOrganizationMembership");
expect(source).toContain("workos.userManagement.createPasswordReset");
expect(source).toContain("internal.whiteLabel.customerAccounts.persistActiveAccount");
expect(source).not.toContain("passwordResetToken");
expect(source).not.toContain("console.log");
~~~

- [ ] **Step 6: Verify action contracts fail**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerAccountActions.test.ts
~~~

Expected: FAIL because the action module is absent.

- [ ] **Step 7: Implement the two Node actions**

Create a use-node module that:
1. authorizes the partner with internal.whiteLabel.portalAuthorization.getInvitableOrganization;
2. normalizes the email and maps owner, admin, or member to the existing WorkOS role slug;
3. passes generateInitialCustomerPassword(), emailVerified: true, and the normalized email to workos.userManagement.createUser;
4. calls workos.userManagement.createOrganizationMembership with the WorkOS organization ID, created user ID, and role slug;
5. persists the returned membership ID through persistActiveAccount after both WorkOS calls;
6. returns only { workosUserId: user.id };
7. deletes the newly created user and rethrows if membership creation fails.

The reset action must get the authenticated user, query hasCurrentPasswordAccount through ctx.runQuery, reject a false result, call:
~~~ts
const passwordReset = await workos.userManagement.createPasswordReset({
  email: auth.email,
});
return { passwordResetUrl: passwordReset.passwordResetUrl };
~~~
It must not return passwordResetToken.

Expose both new actions in whiteLabelApi.actions. Keep the existing invitation action untouched for callers outside the Partner Programme.

- [ ] **Step 8: Verify password and action tests**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run convex/whiteLabel/customerAccountPassword.test.ts convex/whiteLabel/customerAccountActions.test.ts
~~~

Expected: PASS.

- [ ] **Step 9: Commit**

~~~bash
git add convex/whiteLabel/customerAccountPassword.ts convex/whiteLabel/customerAccountPassword.test.ts convex/whiteLabel/customerAccountActions.ts convex/whiteLabel/customerAccountActions.test.ts src/lib/whiteLabelApi.ts src/pages/PartnerPage.test.ts
git commit -m "feat: create active partner customer accounts"
~~~

### Task 3: Update Partner Programme creation and status UI

**Files:**
- Modify: src/pages/PartnerPage.tsx:1-260
- Modify: src/components/partner/PartnerCustomerForms.tsx:1-260
- Modify: src/components/partner/PartnerCustomerList.tsx:1-130
- Modify: src/pages/PartnerPage.test.ts

**Interfaces:**
- Consumes whiteLabelApi.actions.createCustomerAccount.
- Consumes customer statuses pending, accepted, and active.
- Produces a closed dialog only after successful direct provisioning.

- [ ] **Step 1: Write failing UI contracts**

Add this to src/pages/PartnerPage.test.ts:

~~~ts
expect(pageSource).toContain("createCustomerAccount");
expect(pageSource).toContain(
  "Customer account created. They can set a password using Forgot password on the sign-in page.",
);
expect(customerFormsSource).toContain("isCustomerDialogOpen");
expect(customerListSource).toContain("<TableHead>Status</TableHead>");
expect(customerListSource).toContain('customer.invitationStatus === "active"');
expect(customerListSource).toContain("bg-emerald-500");
~~~

- [ ] **Step 2: Verify the UI contract fails**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/PartnerPage.test.ts
~~~

Expected: FAIL because the portal still sends an invitation.

- [ ] **Step 3: Implement direct-account creation UX**

In PartnerPage call createCustomerAccount, clear the email only after it succeeds, and use the exact toast:
~~~ts
"Customer account created. They can set a password using Forgot password on the sign-in page."
~~~

Make the customer dialog controlled as the organization dialog is. Change its submit callback to Promise<boolean>, and close only when it resolves true. Change action-card and dialog wording to say the account is created immediately. Retain the existing Spinner and disabled submit controls.

- [ ] **Step 4: Implement unified statuses**

Rename Invitation status to Status. Show a green dot for active, the existing yellow dot for pending, and no dot for accepted. Keep neutral Badge styling and the shadcn Table.

- [ ] **Step 5: Verify the UI contract passes**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/PartnerPage.test.ts
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/pages/PartnerPage.tsx src/components/partner/PartnerCustomerForms.tsx src/components/partner/PartnerCustomerList.tsx src/pages/PartnerPage.test.ts
git commit -m "feat: show active partner customer accounts"
~~~

### Task 4: Add eligible Profile reset access and verify the full feature

**Files:**
- Modify: src/pages/SettingsPage.tsx:1-220
- Create: src/pages/SettingsPage.test.ts
- Modify: CONTINUITY.md

**Interfaces:**
- Consumes api.whiteLabel.customerAccounts.hasCurrentPasswordAccount({}) => boolean.
- Consumes api.whiteLabel.customerAccountActions.startCurrentUserPasswordReset({}) => { passwordResetUrl: string }.
- Produces Reset password only for an active persisted password account.

- [ ] **Step 1: Write a failing Profile contract**

Create src/pages/SettingsPage.test.ts:

~~~ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const settingsSource = readFileSync(new URL("./SettingsPage.tsx", import.meta.url), "utf8");

test("only exposes password reset to active password accounts", () => {
  expect(settingsSource).toContain("hasCurrentPasswordAccount");
  expect(settingsSource).toContain("startCurrentUserPasswordReset");
  expect(settingsSource).toContain("Reset password");
  expect(settingsSource).toContain("window.location.assign");
  expect(settingsSource).toContain("passwordResetUrl");
});
~~~

- [ ] **Step 2: Verify it fails**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/SettingsPage.test.ts
~~~

Expected: FAIL because Profile has no reset action.

- [ ] **Step 3: Implement the conditional Profile action**

In ProfileContent, query the account capability after AuthKit resolves the user. Render a Reset password Button only when it is true. While clicked, disable it and show Spinner; call startCurrentUserPasswordReset({}), then navigate with:
~~~ts
window.location.assign(result.passwordResetUrl);
~~~
On failure, clear loading and show the existing toast error pattern. Never render a reset URL or token.

- [ ] **Step 4: Verify the Profile contract passes**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/SettingsPage.test.ts
~~~

Expected: PASS.

- [ ] **Step 5: Run final verification**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/PartnerPage.test.ts src/pages/SettingsPage.test.ts convex/whiteLabel/customerAccountPassword.test.ts convex/whiteLabel/customerAccountActions.test.ts
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx tsc --noEmit
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx eslint src/pages/PartnerPage.tsx src/components/partner/PartnerCustomerForms.tsx src/components/partner/PartnerCustomerList.tsx src/pages/SettingsPage.tsx convex/whiteLabel/customerAccounts.ts convex/whiteLabel/customerAccountActions.ts convex/whiteLabel/customerAccountPassword.ts
git diff --check
~~~

Expected: every command exits successfully.


### Task 5: Remove customer access and customer organizations through actions menus

**Files:**
- Modify: convex/whiteLabel/customerAccounts.ts
- Modify: convex/whiteLabel/customerAccountActions.ts
- Modify: convex/whiteLabel/portal.ts
- Modify: convex/teamDeletion/local.ts
- Create: convex/teamDeletion/whiteLabelCleanup.ts
- Modify: src/lib/whiteLabelApi.ts
- Modify: src/pages/PartnerPage.tsx
- Modify: src/components/partner/PartnerOrganizationList.tsx
- Modify: src/components/partner/PartnerCustomerList.tsx
- Modify: src/pages/PartnerPage.test.ts

**Interfaces:**
- Produces removeCustomerFromOrganization({ partnerOrganizationId, customer }) => null, where customer identifies an active account by membership ID or a legacy invitation by invitation ID and accepted user ID.
- Produces deletePartnerOrganization({ partnerOrganizationId }) => { accepted: true, duplicate: boolean }.
- Produces deleteWhiteLabelPartnerOrganizationPage(ctx, teamId) => boolean for the existing team-deletion cascade.

- [ ] **Step 1: Write failing deletion source contracts**

Add Partner Programme expectations for MoreHorizontal, DropdownMenu, Delete customer, Delete organization, confirmation dialogs, and action references. Add a team-deletion source test that expects whiteLabelCleanup to run before generic local deletion.

~~~ts
expect(customerListSource).toContain("MoreHorizontal");
expect(customerListSource).toContain("Delete customer");
expect(organizationListSource).toContain("Delete organization");
expect(organizationListSource).toContain("DropdownMenu");
expect(pageSource).toContain("removeCustomerFromOrganization");
expect(pageSource).toContain("deletePartnerOrganization");
~~~

- [ ] **Step 2: Verify the deletion contracts fail**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/PartnerPage.test.ts convex/teamDeletionCascade.test.ts
~~~

Expected: FAIL because neither table has the required action menu or deletion action.

- [ ] **Step 3: Add partner-authorized customer removal**

Extend overview customer rows with partnerOrganizationId and a removal discriminator. For active accounts, pass the stored WorkOS organization membership ID. For pending invitations, pass the WorkOS invitation ID. For accepted invitations, pass both the invitation ID and accepted WorkOS user ID.

In customerAccountActions.ts, authorize the partner organization, then:

~~~ts
await workos.userManagement.deleteOrganizationMembership(
  account.workosOrganizationMembershipId,
);
~~~

for direct accounts; revoke a pending invitation with revokeInvitation; and resolve then delete an accepted user's membership with listOrganizationMemberships({ organizationId, userId }) before deleting its local invitation cache. Use internal mutations to delete only local rows belonging to the authorized partner organization. Never call deleteUser.

- [ ] **Step 4: Add safe organization-deletion orchestration**

Add a portal mutation that verifies partner ownership, resolves the selected WorkOS organization, calls requestTeamDeletion with source workos and preserveOwnerSubscription true, and patches the partner organization status to suspended so it disappears immediately from the active overview.

Create whiteLabelCleanup.ts. It must find the partner organization by team ID and page-delete active accounts, invitation records matching the team WorkOS organization, plans, assignments, credit periods, grants, balances, ledger entries, and finally the partner organization row. Call it at the start of local deletion and return to the worker until it has no rows left. Do not delete partner branding or custom-domain rows.

- [ ] **Step 5: Add menus, confirmation dialogs, and loading state**

Replace the existing Suspend button with a ghost icon-only MoreHorizontal trigger. Its menu contains Delete. Add the same trigger to customer rows. Each Delete item opens a destructive confirmation dialog; while the action runs, disable confirmation and show Spinner. On success, close the dialog and use a toast saying Customer removed from organization. or Organization deletion started. Retain the plan selector and status badge.

- [ ] **Step 6: Verify deletion contracts pass**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/PartnerPage.test.ts convex/teamDeletionCascade.test.ts
~~~

Expected: PASS.

- [ ] **Step 7: Run final verification and commit**

~~~bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/pages/PartnerPage.test.ts src/pages/SettingsPage.test.ts convex/whiteLabel/customerAccountPassword.test.ts convex/whiteLabel/customerAccountActions.test.ts convex/teamDeletionCascade.test.ts
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx convex codegen
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx tsc --noEmit
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx eslint src/pages/PartnerPage.tsx src/components/partner/PartnerCustomerForms.tsx src/components/partner/PartnerCustomerList.tsx src/components/partner/PartnerOrganizationList.tsx src/pages/SettingsPage.tsx convex/whiteLabel/customerAccounts.ts convex/whiteLabel/customerAccountActions.ts convex/whiteLabel/customerAccountPassword.ts convex/teamDeletion/whiteLabelCleanup.ts convex/teamDeletion/local.ts
git diff --check
git add convex src CONTINUITY.md docs/superpowers/plans/2026-08-24-partner-active-customer-accounts.md docs/superpowers/specs/2026-08-24-partner-active-customer-accounts-design.md
git commit -m "feat: manage partner customer access"
~~~

## Plan Self-Review

- Spec coverage: Task 1 covers persistence and reporting; Task 2 covers secure direct provisioning and WorkOS reset URLs; Task 3 covers Partner Programme behavior; Task 4 covers eligible Profile access; Task 5 covers customer and organization deletion and final verification.
- Placeholder scan: the plan contains no deferred requirements or unassigned decisions.
- Type consistency: active is added to the existing invitationStatus client field, and the actions are createCustomerAccount and startCurrentUserPasswordReset throughout.
