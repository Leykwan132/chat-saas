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
