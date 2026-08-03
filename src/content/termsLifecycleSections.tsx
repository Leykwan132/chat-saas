import type { LegalSection } from '@/components/LegalDocument';
import { LEGAL_EMAIL, PRODUCT_NAME } from './legalConstants';

export const termsLifecycleSections: LegalSection[] = [
  {
    id: 'service-interruption',
    title: 'Service interruption and availability',
    body: (
      <>
        <p>
          To maintain the best possible service level, we may interrupt the Services for
          maintenance, system updates, or other operational changes. Where reasonably practical,
          we will provide appropriate notice.
        </p>
        <p>
          To the extent permitted by law, we may suspend or discontinue the Services. If we
          discontinue them, we will reasonably cooperate to enable you to withdraw personal
          information or other information where applicable law requires it.
        </p>
        <p>
          The Services may be unavailable for reasons outside our reasonable control, including
          labour actions, infrastructure breakdowns, blackouts, or other force majeure events.
        </p>
      </>
    ),
  },
  {
    id: 'account-termination',
    title: 'Account termination',
    body: (
      <>
        <p>
          You may terminate your account and stop using the Services at any time by contacting us
          at <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
        </p>
        <p>
          After termination, we delete personal information and Service data as described in our
          Privacy Policy, subject to the retention exceptions stated there. Your right to access
          the Services ends when your account is terminated.
        </p>
      </>
    ),
  },
  {
    id: 'suspension-and-termination',
    title: `Suspension and termination by ${PRODUCT_NAME}`,
    body: (
      <>
        <p>
          We may suspend or delete your account at our discretion and without notice if we consider
          the account or its activity inappropriate, offensive, or in violation of these Terms.
        </p>
        <p>
          To the extent permitted by law, suspension or deletion does not entitle you to
          compensation, damages, or reimbursement. Termination or suspension for a reason
          attributable to you does not excuse unpaid fees or other amounts you owe.
        </p>
        <p>
          Provisions that by their nature should survive termination, including payment obligations,
          disclaimers, liability limits, and indemnification, survive termination. You may not
          create another account after termination for cause without our permission.
        </p>
      </>
    ),
  },
];
