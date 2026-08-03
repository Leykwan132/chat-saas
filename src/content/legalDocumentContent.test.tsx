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
    'Kilobot never receives your Google password',
    'Security and performance',
    'Cloudflare Workers',
    'Cloudflare R2',
    'Payment service',
    'Stripe',
    'Data security',
    'TLS encryption',
    'as soon as it is no longer needed for its original purpose',
  ]) {
    expect(policy).toContain(text);
  }
});

test('privacy policy links AI processing disclosure to OpenRouter privacy information', () => {
  const policy = renderLegalSections(privacyPolicySections);

  expect(policy).toContain('href="https://openrouter.ai/privacy"');
});

test('terms state the approved contractual protections', () => {
  const terms = renderLegalSections(termsOfServiceSections);

  expect(terms).toContain('MorphSwift Studio');
  expect(terms).not.toContain('Morph Swift Studio');
  expect(terms).toContain(
    'Cancellation takes effect immediately and is reflected directly in your billing status.',
  );
  expect(terms).not.toContain('Cancellation takes effect at the end of the then-current paid period.');
  expect(terms).not.toContain(
    'The Early Adopter Program is not a free trial and does not automatically convert to a paid subscription unless we expressly tell the participant otherwise.',
  );

  for (const text of [
    'What Kilobot means',
    'Changes to these Terms',
    'Subscription terms',
    'Kilobot does not offer free trials',
    'Early Adopter Program',
    'Content provided by Kilobot',
    'Software license',
    'Service reselling',
    'Content backups',
    'Service interruption and availability',
    'Account termination',
    'Suspension and termination by Kilobot',
    'Disclaimer of warranties',
    'Indemnification',
  ]) {
    expect(terms).toContain(text);
  }
});

test('legal documents use the approved last-updated date', () => {
  expect(LEGAL_LAST_UPDATED).toBe('August 03, 2026');
});
