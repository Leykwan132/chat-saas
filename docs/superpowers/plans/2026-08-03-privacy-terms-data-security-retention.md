# KiloBot Privacy and Terms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish factual, user-approved Privacy Policy and Terms of Service updates for KiloBot, and rename the footer legal link to `Terms of Service`.

**Architecture:** Break the two legal-content arrays into focused content modules so every TypeScript source file remains under 300 lines. Keep `privacyPolicy.tsx` and `termsOfService.tsx` as stable composition entrypoints for their existing pages, then verify the final public content by rendering the legal section arrays inside a memory router.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Vite, Tailwind CSS

## Global Constraints

- Use Node v22 for every test or build command.
- Do not change product behavior, retention automation, vendor contracts, billing flows, or authentication.
- Keep all source code files at 300 lines or fewer; legal-content modules may be split by subject.
- KiloBot is a Malaysian business: do not add GDPR/UK GDPR legal bases, fixed log retention, data-transfer certification, or Webflow/JsDelivr claims.
- Name only verified providers: Cloudflare Workers and R2, Convex, WorkOS AuthKit, Google sign-in, Stripe, OpenRouter, and Meta.
- Do not claim KiloBot stores passwords, provides a free trial, automatically converts Early Adopters into paid customers, performs credit checks, guarantees backups, uptime, security, recovery, or breach notifications.
- Display `August 03, 2026` as the legal documents' last-updated date.
- These changes are not released during this task; update `CONTINUITY.md`, not the public changelog.

## File Structure

- Create: `src/content/privacyPolicyServiceSections.tsx` — overview, collection, use, sharing, AI, and cookies.
- Create: `src/content/privacyPolicyProviderSections.tsx` — WorkOS/AuthKit, Google sign-in, Cloudflare, and Stripe disclosures.
- Create: `src/content/privacyPolicyRightsSections.tsx` — retention, data security, rights, and contact.
- Modify: `src/content/privacyPolicy.tsx` — compose the three privacy section arrays with its current public export.
- Create: `src/content/termsAgreementSections.tsx` — acceptance, KiloBot definition, Terms changes, service description, accounts, and account security.
- Create: `src/content/termsCommercialSections.tsx` — subscriptions, KiloBot-provided content, software licence, and reselling.
- Create: `src/content/termsUserContentSections.tsx` — user content, backups, AI/channels, acceptable use, service interruption, and account termination/suspension.
- Create: `src/content/termsLegalSections.tsx` — warranties, liability, indemnification, governing law, and contact.
- Modify: `src/content/termsOfService.tsx` — compose the four Terms section arrays with its current public export.
- Create: `src/content/legalDocumentContent.test.tsx` — server-rendered regression coverage for the approved public privacy and Terms content.
- Modify: `src/content/legalConstants.ts` — legal document date only.
- Modify: `src/components/SiteFooter.tsx` — replace the `/terms` link label only.
- Modify: `src/components/SiteFooter.test.ts` — assert the public footer label and route.
- Modify: `CONTINUITY.md` — record the unreleased legal-document implementation and verification receipt.

---

### Task 1: Establish failing public legal-content coverage

**Files:**
- Create: `src/content/legalDocumentContent.test.tsx`
- Modify: `src/components/SiteFooter.test.ts`

**Interfaces:**
- Consumes: `privacyPolicySections`, `termsOfServiceSections`, and `LegalDocument`.
- Produces: a rendered-content regression contract that later content modules must satisfy.

- [ ] **Step 1: Write the failing rendered-content test**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { LegalDocument, type LegalSection } from '@/components/LegalDocument';
import { LEGAL_LAST_UPDATED } from './legalConstants';
import { privacyPolicySections } from './privacyPolicy';
import { termsOfServiceSections } from './termsOfService';

function renderLegalSections(sections: LegalSection[]) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <LegalDocument sections={sections} />
    </MemoryRouter>,
  );
}

test('privacy policy states the approved provider, retention, and security practices', () => {
  const policy = renderLegalSections(privacyPolicySections);

  for (const text of [
    'Authentication service',
    'WorkOS AuthKit',
    'Google sign-in',
    'KiloBot never receives your Google password',
    'Security and performance',
    'Cloudflare Workers',
    'Cloudflare R2',
    'Payment service',
    'Stripe',
    'Data security',
    'TLS encryption',
    'when it is no longer needed for its original purpose',
  ]) {
    expect(policy).toContain(text);
  }
});

test('terms state the approved contractual protections', () => {
  const terms = renderLegalSections(termsOfServiceSections);

  for (const text of [
    'What KiloBot means',
    'Changes to these Terms',
    'Subscription terms',
    'KiloBot does not offer free trials',
    'Early Adopter Program',
    'Content provided by KiloBot',
    'Software license',
    'Service reselling',
    'Content backups',
    'Service interruption and availability',
    'Account termination',
    'Suspension and termination by KiloBot',
    'Disclaimer of warranties',
    'Indemnification',
  ]) {
    expect(terms).toContain(text);
  }
});

test('legal documents use the approved last-updated date', () => {
  expect(LEGAL_LAST_UPDATED).toBe('August 03, 2026');
});
```

Add this assertion to `src/components/SiteFooter.test.ts`:

```ts
test('footer labels the terms link accurately', () => {
  expect(siteFooterSource).toContain('to="/terms"');
  expect(siteFooterSource).toContain('Terms of Service');
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/content/legalDocumentContent.test.tsx src/components/SiteFooter.test.ts`

Expected: FAIL because the approved sections, date, and footer label do not yet exist.

- [ ] **Step 3: Commit the failing regression contract**

```bash
git add src/content/legalDocumentContent.test.tsx src/components/SiteFooter.test.ts
git commit -m "test: cover public legal document updates"
```

### Task 2: Implement the Privacy Policy content modules

**Files:**
- Create: `src/content/privacyPolicyServiceSections.tsx`
- Create: `src/content/privacyPolicyProviderSections.tsx`
- Create: `src/content/privacyPolicyRightsSections.tsx`
- Modify: `src/content/privacyPolicy.tsx`

**Interfaces:**
- Produces: `privacyPolicyServiceSections`, `privacyPolicyProviderSections`, and `privacyPolicyRightsSections`, each typed as `LegalSection[]`.
- Consumes: the existing legal constants and `react-router` `Link` only where a local privacy/Terms route is required.
- Preserves: `export const privacyPolicySections: LegalSection[]` for `PrivacyPage`.

- [ ] **Step 1: Move the existing service-data sections into `privacyPolicyServiceSections.tsx`**

Export the current `Overview`, `Information we collect`, `How we use information`, `How we share information`, `AI processing`, and `Cookies` sections unchanged except for these approved account/data details:

```tsx
<p>
  <strong>Account information.</strong> When you create or use an account, we collect the
  first and last name, email address, profile details, and account preferences supplied through
  WorkOS AuthKit. WorkOS manages authentication credentials; KiloBot does not store your password.
</p>
```

Keep the existing Service data, payment-metadata, Convex, OpenRouter, and Meta disclosures. Do not state that KiloBot stores a password or complete card number.

- [ ] **Step 2: Add the verified provider disclosures in `privacyPolicyProviderSections.tsx`**

Export three `LegalSection` entries with these IDs and required copy contracts:

```tsx
{
  id: 'authentication-service',
  title: 'Authentication service',
  body: <>
    <p>We use WorkOS AuthKit to authenticate accounts. WorkOS processes authentication credentials, while KiloBot receives the account identity information needed to create and manage your account.</p>
    <p>For more information, see <a href="https://workos.com/legal/privacy" target="_blank" rel="noopener noreferrer">WorkOS&apos;s Privacy Policy</a>.</p>
  </>,
}
```

`Google sign-in` must state that users are redirected to Google, receive the same KiloBot account experience, Google provides only name and email address, KiloBot never receives a Google password, and link to `https://myaccount.google.com/permissions` and `https://www.google.com/policies/privacy/partners/`.

`Security and performance` must name Cloudflare Workers for the website/web application and Cloudflare R2 for media storage/delivery, explain the processing of IP address, browser, operating-system, and request information needed to host, secure, and deliver the Services, and link to `https://www.cloudflare.com/privacypolicy/`.

`Payment service` must state Stripe collects payment details directly, may process identity/billing/payment/transaction details for payment, fraud prevention, and legal obligations, KiloBot receives billing metadata but not full card numbers, and link to `https://stripe.com/privacy`.

- [ ] **Step 3: Add rights, retention, and security in `privacyPolicyRightsSections.tsx`**

Use separate `Retention`, `Data security`, and `Your choices and contact` sections. The retention rule must be exactly:

```tsx
<p>
  We delete all personal information and Service data when it is no longer needed for its original
  purpose. We retain data only where necessary to comply with a legal obligation, resolve disputes,
  enforce our agreements, or protect the security and integrity of the Services.
</p>
```

The data-security paragraph must state that KiloBot uses technical and organisational measures, continuously updates security, and uses TLS encryption to secure website data transfers; immediately follow it with the existing no-absolute-security qualification.

- [ ] **Step 4: Compose the public export**

Replace the old monolithic `privacyPolicySections` declaration with:

```tsx
import type { LegalSection } from '@/components/LegalDocument';
import { privacyPolicyProviderSections } from './privacyPolicyProviderSections';
import { privacyPolicyRightsSections } from './privacyPolicyRightsSections';
import { privacyPolicyServiceSections } from './privacyPolicyServiceSections';

export const privacyPolicySections: LegalSection[] = [
  ...privacyPolicyServiceSections,
  ...privacyPolicyProviderSections,
  ...privacyPolicyRightsSections,
];
```

- [ ] **Step 5: Run the legal-content test to verify the Privacy Policy passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/content/legalDocumentContent.test.tsx`

Expected: the privacy assertion passes; the Terms assertion may still fail until Task 3 and Task 4 finish.

- [ ] **Step 6: Commit the Privacy Policy implementation**

```bash
git add src/content/privacyPolicy.tsx src/content/privacyPolicyServiceSections.tsx src/content/privacyPolicyProviderSections.tsx src/content/privacyPolicyRightsSections.tsx
git commit -m "docs: update privacy policy disclosures"
```

### Task 3: Implement account, commercial, and user-content Terms modules

**Files:**
- Create: `src/content/termsAgreementSections.tsx`
- Create: `src/content/termsCommercialSections.tsx`
- Create: `src/content/termsUserContentSections.tsx`

**Interfaces:**
- Produces: three `LegalSection[]` exports named after their files.
- Preserves: the current agreement acceptance, WorkOS account-security requirement, and AI/channel obligations; Task 4 reconnects these modules through the stable public export.

- [ ] **Step 1: Implement `termsAgreementSections.tsx`**

Keep `Agreement to these terms`, then add `What KiloBot means` with this definition:

```tsx
<p>
  &quot;KiloBot&quot; means this website and its subdomains, the web application, APIs, integrations,
  widgets, related applications, sample or content files, source code, scripts, instruction sets,
  software, and documentation that we make available as part of the Services.
</p>
```

Add `Changes to these Terms`: reasonable efforts to notify users before material changes, prospective application only, continued use as acceptance, user must stop using the Services if they do not accept, termination where lawful, and prior versions available on request. Keep `The Services` and `Eligibility and accounts`, then add `Data security` stating users must protect credentials and promptly report suspected access, while KiloBot makes no absolute-security guarantee.

- [ ] **Step 2: Implement `termsCommercialSections.tsx`**

Add `Subscription terms` with all of these concrete rules:

- checkout shows plan description, availability, fees, taxes, billing interval, and other disclosed charges;
- an order creates the obligation to pay the shown amounts;
- Stripe processes payments; paid subscriptions are billed in advance and automatically renew monthly or annually until cancelled through Stripe's billing portal or by contacting KiloBot before renewal;
- cancellation takes effect after the current paid period; failed payment can suspend access; price changes apply to future periods with reasonable prior notice;
- KiloBot has no free trial; accepted Early Adopters receive Growth free for three months for beta feedback and do not automatically become paying subscribers;
- fees are non-refundable except where law requires, including no unused-period or partial-period credit;
- Stripe coupon/promotion-code discounts follow their displayed eligibility, value, duration, and other terms; they are non-transferable, non-combinable unless stated, and do not establish a future right;
- third-party messaging-platform charges remain the user’s responsibility where applicable.

Add `Content provided by KiloBot`, `Software license`, and `Service reselling`. The software licence is revocable, non-exclusive, non-sublicensable, non-transferable, only for the Services’ scope/purpose, excludes source-code rights, reserves technical methods/documentation, and ends with the agreement. The reselling clause prohibits reproduce/duplicate/copy/sell/resell/exploit without KiloBot’s express written permission, including authorised-reseller permission.

- [ ] **Step 3: Implement `termsUserContentSections.tsx`**

Retain ownership of `Your content`, then add: rights/law assurances; a worldwide non-exclusive fully paid-up royalty-free operating, maintenance, improvement, and security licence; a lawful moral-rights waiver; sole user responsibility; no review/pre-screen/moderation obligation; and removal/blocking/modification/restricted access without notice after a complaint, infringement notice, public-authority order, or identified risk.

Add `Content backups` stating KiloBot may perform backups but does not guarantee loss-free Content or usable restoration, will investigate known issues, excludes liability to the extent permitted by law, and requires independent complete/accurate copies.

Retain AI/channels/acceptable-use sections. Add `Service interruption and availability` for maintenance, updates, operational changes with notice when practical, discontinuation/suspension within law, reasonable lawful-data withdrawal cooperation if discontinued, and force majeure/labour/infrastructure/blackout unavailability. Add separate `Account termination` (request by contact email, data deletion subject to the policy) and `Suspension and termination by KiloBot` (inappropriate/offensive/violating accounts, no compensation where lawful, outstanding fees, survival, and no new account after cause).

- [ ] **Step 4: Commit the content and commercial Terms sections**

```bash
git add src/content/termsAgreementSections.tsx src/content/termsCommercialSections.tsx src/content/termsUserContentSections.tsx
git commit -m "docs: expand KiloBot service terms"
```

### Task 4: Implement warranty, liability, indemnity, date, and footer changes

**Files:**
- Create: `src/content/termsLegalSections.tsx`
- Modify: `src/content/termsOfService.tsx`
- Modify: `src/content/legalConstants.ts`
- Modify: `src/components/SiteFooter.tsx`
- Modify: `src/components/SiteFooter.test.ts`

**Interfaces:**
- Produces: `termsLegalSections: LegalSection[]` imported by `termsOfService.tsx`.
- Preserves: Malaysian governing law, informal dispute process, and public `/terms` route.

- [ ] **Step 1: Implement `termsLegalSections.tsx`**

The `Disclaimers and limitation of liability` section must use a `Disclaimer of warranties` subheading and include the approved as-is/as-available, own-risk, no-advice-warranty, no accuracy/requirements/availability/security/error/virus guarantee, downloaded-content risk, third-party offer/link/transaction, and device/browser/operating-system compatibility language.

Its liability subsection must exclude indirect, punitive, incidental, special, consequential, and exemplary losses; lost profits, goodwill, use, data, and intangibles; hacking/tampering/unauthorised access; content errors/omissions; personal/property harm; server/stored-information access; transmission interruption; malware; content reliance; and unlawful/offensive/defamatory user or third-party conduct. State the cap as the fees paid during the shorter of the preceding twelve months or the agreement duration. Apply the cap to contract, tort, negligence, strict liability, and other theories even if warned. Preserve non-waivable legal rights and jurisdiction-specific exceptions. Do not retain the `MYR 100` unpaid-user minimum.

Expand `Indemnification` so the protected parties include KiloBot, affiliates, officers, directors, agents, partners, suppliers, and employees. Cover claims, demands, damages, obligations, losses, liabilities, costs, debts, and reasonable legal fees arising from Service use, transmitted/received content, Terms/warranty breach, law or third-party-rights violations, account content/credential access, wilful misconduct, and related personnel. Retain the governing-law and contact sections.

- [ ] **Step 2: Compose the stable Terms export**

```tsx
import type { LegalSection } from '@/components/LegalDocument';
import { termsAgreementSections } from './termsAgreementSections';
import { termsCommercialSections } from './termsCommercialSections';
import { termsLegalSections } from './termsLegalSections';
import { termsUserContentSections } from './termsUserContentSections';

export const termsOfServiceSections: LegalSection[] = [
  ...termsAgreementSections,
  ...termsCommercialSections,
  ...termsUserContentSections,
  ...termsLegalSections,
];
```

- [ ] **Step 3: Update the legal date and footer label**

```ts
export const LEGAL_LAST_UPDATED = 'August 03, 2026';
```

```tsx
<Link to="/terms" className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white">
  Terms of Service
</Link>
```

- [ ] **Step 4: Run focused tests to verify all contractual content passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/content/legalDocumentContent.test.tsx src/components/SiteFooter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the final public legal content**

```bash
git add src/content/termsLegalSections.tsx src/content/termsOfService.tsx src/content/legalConstants.ts src/components/SiteFooter.tsx src/components/SiteFooter.test.ts
git commit -m "docs: publish updated legal terms"
```

### Task 5: Verify public legal documents and record the unreleased work

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: the finished legal content arrays and footer source.
- Produces: build evidence and a concise unreleased-work receipt.

- [ ] **Step 1: Check the legal-content source and line limits**

Run:

```bash
rg -n 'Webflow|JsDelivr|GDPR|UK GDPR|MYR 100|Free Trial' src/content/privacyPolicy*.tsx src/content/terms*.tsx
wc -l src/content/privacyPolicy*.tsx src/content/terms*.tsx
git diff --check
```

Expected: no prohibited provider/regulatory/cap/free-trial claims, every modified TypeScript source file is at most 300 lines, and no whitespace errors.

- [ ] **Step 2: Run the production build**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && bun run build`

Expected: TypeScript and Vite build pass; report any pre-existing environment or chunk-size warning without changing unrelated code.

- [ ] **Step 3: Update the continuity ledger and commit verification**

Add one concise, dated `[CODE]` entry that records the public legal scope, focused-test result, build result, branch, and unreleased status. Do not update `kilobot-docs/docs/releases/changelog.mdx` because production availability is unconfirmed.

```bash
git add CONTINUITY.md
git commit -m "docs: record legal update verification"
```

## Plan Self-Review

- Spec coverage: Tasks 2–4 cover every approved provider, security, retention, account, subscription, content, availability, warranty, liability, indemnity, footer, and last-updated requirement. Task 5 verifies the prohibited copied claims and publishing artifacts.
- Placeholder scan: no `TODO`, `TBD`, generic test instruction, or unstated interface remains.
- Type consistency: all module arrays use `LegalSection[]`; only the stable `privacyPolicySections` and `termsOfServiceSections` exports are consumed by the existing pages.
