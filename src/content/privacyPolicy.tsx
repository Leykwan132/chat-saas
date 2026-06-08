import { Link } from 'react-router';
import type { LegalSection } from '@/components/LegalDocument';
import {
  LEGAL_ADDRESS,
  LEGAL_EMAIL,
  LEGAL_ENTITY,
  PRODUCT_NAME,
  PRODUCT_URL,
} from './legalConstants';

export const privacyPolicySections: LegalSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    body: (
      <>
        <p>
          This Privacy Policy explains how {LEGAL_ENTITY} (&quot;we&quot;, &quot;us&quot;, or
          &quot;our&quot;) collects, uses, and shares personal information when you use{' '}
          {PRODUCT_NAME}, our SaaS platform that puts AI agents in your messaging inbox so sales
          teams can qualify leads, answer questions, and move deals forward (
          <a href={PRODUCT_URL} target="_blank" rel="noopener noreferrer">
            {PRODUCT_URL.replace('https://', '')}
          </a>
          ) and related services (collectively, the &quot;Services&quot;).
        </p>
        <p>
          If you do not agree with this Privacy Policy, please do not use the Services. Questions?
          Contact us at{' '}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <p>We collect personal information you provide and information generated through your use of the Services.</p>
        <p>
          <strong>Account information.</strong> When you register or sign in (via WorkOS AuthKit), we
          may collect your email address, name, username, profile picture, and account preferences.
        </p>
        <p>
          <strong>Service data.</strong> When you use {PRODUCT_NAME}, we process content you and your
          team add to the platform, including agent configurations, knowledge base materials,
          conversation threads, customer records, and messages sent or received through connected
          channels (such as WhatsApp, Instagram, or Messenger).
        </p>
        <p>
          <strong>Payment information.</strong> If you subscribe to a paid plan, payment details such
          as card numbers and security codes are collected and stored by Stripe, our payment
          processor. We receive billing metadata (for example, subscription status and customer ID)
          but do not store full payment card numbers on our servers. See{' '}
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
            Stripe&apos;s Privacy Policy
          </a>
          .
        </p>
        <p>
          We do not intentionally collect sensitive personal information (such as racial or ethnic
          origin, health data, or religious beliefs), and we do not purchase personal information
          from data brokers.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    title: 'How we use information',
    body: (
      <>
        <p>We use personal information to:</p>
        <ul>
          <li>Create, authenticate, and manage your account</li>
          <li>Provide, operate, and improve the Services</li>
          <li>Process subscriptions and billing</li>
          <li>Generate AI-assisted replies and automations you configure</li>
          <li>Communicate with you about the Services, security, and support</li>
          <li>Detect, prevent, and address fraud, abuse, and security issues</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>
          We process your information only when we have a valid legal reason, such as performing our
          contract with you, pursuing legitimate interests, or complying with law.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-share-information',
    title: 'How we share information',
    body: (
      <>
        <p>We may share personal information in these situations:</p>
        <ul>
          <li>
            <strong>Service providers</strong> who help us run {PRODUCT_NAME}, including Stripe
            (payments), OpenRouter (AI processing), WorkOS (authentication), Convex (hosting and
            backend infrastructure), and Meta platforms when you connect messaging channels
          </li>
          <li>
            <strong>Business transfers</strong>, such as a merger, acquisition, or sale of assets
          </li>
          <li>
            <strong>Legal requirements</strong>, when we believe disclosure is necessary to comply
            with law, enforce our terms, or protect rights and safety
          </li>
        </ul>
        <p>We do not sell your personal information.</p>
      </>
    ),
  },
  {
    id: 'ai-processing',
    title: 'AI processing',
    body: (
      <>
        <p>
          {PRODUCT_NAME} includes AI-powered features. To provide these features, we may send
          conversation content, knowledge base excerpts, and related context to third-party AI
          providers (including OpenRouter) for processing. These providers process data according to
          their own policies and our agreements with them.
        </p>
        <p>
          You are responsible for ensuring that content you submit for AI processing complies with
          applicable law and any third-party platform rules (including Meta messaging policies).
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: (
      <>
        <p>
          We use cookies and similar technologies that are necessary to operate the Services, such as
          keeping you signed in and remembering your preferences. We do not use advertising or
          analytics cookies on the Services today.
        </p>
        <p>
          You can control cookies through your browser settings. Disabling essential cookies may
          affect your ability to use the Services.
        </p>
      </>
    ),
  },
  {
    id: 'retention-and-security',
    title: 'Retention and security',
    body: (
      <>
        <p>
          We keep personal information for as long as your account is active and as needed to provide
          the Services, unless a longer retention period is required by law. When we no longer need
          your information, we delete or anonymize it where possible.
        </p>
        <p>
          We use organizational and technical measures designed to protect personal information.
          However, no method of transmission or storage is completely secure, and we cannot guarantee
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
          processing of your personal information, or to withdraw consent where processing is based on
          consent.
        </p>
        <p>
          You can review and update account information in your account settings. To request access,
          correction, or deletion, email us at{' '}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. We will respond as required by
          applicable law.
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
