import { Link } from 'react-router';
import type { LegalSection } from '@/components/LegalDocument';
import {
  LEGAL_ADDRESS,
  LEGAL_EMAIL,
  LEGAL_ENTITY,
  PRODUCT_NAME,
} from './legalConstants';

export const privacyPolicyRightsSections: LegalSection[] = [
  {
    id: 'retention',
    title: 'Retention',
    body: (
      <p>
        We delete all personal information and Service data as soon as it is no longer needed for
        its original purpose. We retain data only where necessary to comply with a legal obligation,
        resolve disputes, enforce our agreements, or protect the security and integrity of the
        Services.
      </p>
    ),
  },
  {
    id: 'data-security',
    title: 'Data security',
    body: (
      <>
        <p>
          We use technical and organizational measures to protect personal data from accidental or
          unauthorized access, loss, or manipulation. Our security is continuously updated, and we
          use TLS encryption to secure data transfers on our website.
        </p>
        <p>
          No method of transmission or storage is completely secure, and we cannot guarantee
          absolute security.
        </p>
      </>
    ),
  },
  {
    id: 'your-choices-and-contact',
    title: 'Your choices and contact',
    body: (
      <>
        <p>
          Depending on where you live, you may have rights to access, correct, delete, or restrict
          processing of your personal information, or to withdraw consent where processing is based
          on consent.
        </p>
        <p>
          You can review and update account information in your account settings. To request access,
          correction, or deletion, email us at <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
          We will respond as required by applicable law.
        </p>
        <p>
          The Services are not intended for anyone under 18. If we learn we have collected personal
          information from a minor, we will take steps to delete it.
        </p>
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the
          top reflects the latest version. Continued use of the Services after changes means you
          accept the updated policy. Use of {PRODUCT_NAME} is also subject to our{' '}
          <Link to="/terms">Terms of Service</Link>.
        </p>
        <p>
          <strong>{LEGAL_ENTITY}</strong>
          <br />
          {LEGAL_ADDRESS.line1}
          <br />
          {LEGAL_ADDRESS.city}, {LEGAL_ADDRESS.state} {LEGAL_ADDRESS.postalCode}
          <br />
          {LEGAL_ADDRESS.country}
          <br />
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>
        </p>
      </>
    ),
  },
];
