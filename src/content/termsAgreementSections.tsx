import { Link } from 'react-router';
import type { LegalSection } from '@/components/LegalDocument';
import {
  LEGAL_ENTITY,
  PRODUCT_NAME,
  PRODUCT_URL,
} from './legalConstants';

export const termsAgreementSections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement to these Terms',
    body: (
      <>
        <p>
          These Terms of Service (&quot;Terms&quot;) are a binding agreement between you and{' '}
          {LEGAL_ENTITY} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). They govern your access
          to and use of {PRODUCT_NAME} at{' '}
          <a href={PRODUCT_URL} target="_blank" rel="noopener noreferrer">
            {PRODUCT_URL.replace('https://', '')}
          </a>{' '}
          and related products and services (collectively, the &quot;Services&quot;).
        </p>
        <p>
          By accessing or using the Services, you agree to these Terms and our{' '}
          <Link to="/privacy">Privacy Policy</Link>. If you do not agree, you may not use the
          Services.
        </p>
      </>
    ),
  },
  {
    id: 'what-kilobot-means',
    title: `What ${PRODUCT_NAME} means`,
    body: (
      <>
        <p>{PRODUCT_NAME} refers to:</p>
        <ul>
          <li>
            This website, its subdomains, and any other website through which we make the Services
            available
          </li>
          <li>The Services</li>
          <li>
            Our web application, APIs, integrations, and widgets that are part of the Services
          </li>
          <li>
            Any application, sample or content file, source code, script, instruction set, software,
            or related documentation included with the Services
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'changes-to-terms',
    title: 'Changes to these Terms',
    body: (
      <>
        <p>
          We may amend these Terms at any time. If a change is material, we will make reasonable
          efforts to give you notice before the new Terms take effect. We determine whether a
          change is material in our discretion, subject to applicable law.
        </p>
        <p>
          Changes apply only to the relationship between you and us after they take effect.
          Continuing to use the Services after that date means you accept the revised Terms. If you
          do not accept them, you must stop using the Services, and either party may terminate this
          agreement where permitted by law.
        </p>
        <p>
          The version in effect before you accept revised Terms governs the prior relationship. You
          may request a previous version from us.
        </p>
      </>
    ),
  },
  {
    id: 'the-services',
    title: 'The Services',
    body: (
      <>
        <p>
          {PRODUCT_NAME} is a SaaS platform that puts AI agents in your messaging inbox, enabling
          teams to qualify leads, answer questions, and move deals forward around the clock.
        </p>
        <p>
          The Services are not intended for use in jurisdictions where that use would violate local
          law. If you access the Services from outside Malaysia, you are responsible for complying
          with local laws.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility-and-accounts',
    title: 'Eligibility and accounts',
    body: (
      <>
        <p>To use the Services, you represent that you:</p>
        <ul>
          <li>Are at least 18 years old</li>
          <li>Have the authority to enter into these Terms</li>
          <li>Will provide accurate and complete account information and keep it up to date</li>
          <li>Will not use the Services for illegal or unauthorized purposes</li>
          <li>Will comply with applicable laws and regulations</li>
        </ul>
        <p>
          You must create an account and provide all requested information truthfully and completely
          to use the Services. If you do not, the Services may be unavailable to you.
        </p>
      </>
    ),
  },
  {
    id: 'account-security',
    title: 'Account security',
    body: (
      <>
        <p>
          Accounts are authenticated through WorkOS AuthKit. You are responsible for keeping your
          login credentials confidential and secure and for all activities that occur under your
          account.
        </p>
        <p>
          Tell us immediately at the contact details in these Terms if you believe your account,
          credentials, or personal information has been accessed, disclosed, or stolen without
          authorization. We use reasonable safeguards, but cannot guarantee absolute account or
          Service security.
        </p>
      </>
    ),
  },
];
