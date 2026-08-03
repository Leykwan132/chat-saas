import type { LegalSection } from '@/components/LegalDocument';
import {
  LEGAL_EMAIL,
  LEGAL_ENTITY,
  PRODUCT_NAME,
  PRODUCT_URL,
} from './legalConstants';

export const privacyPolicyServiceSections: LegalSection[] = [
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
          Contact us at <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <p>
          We collect personal information you provide and information generated through your use of
          the Services.
        </p>
        <p>
          <strong>Account information.</strong> When you create or use an account, we collect the
          first and last name and email address supplied through WorkOS AuthKit, together with
          account preferences you choose to provide. WorkOS manages authentication credentials;
          {PRODUCT_NAME} does not store your password.
        </p>
        <p>
          <strong>Service data.</strong> When you use {PRODUCT_NAME}, we process content you and
          your team add to the platform, including agent configurations, knowledge base materials,
          conversation threads, customer records, messages sent or received through connected
          channels, and other information communicated while using the Services.
        </p>
        <p>
          <strong>Payment information.</strong> If you subscribe to a paid plan, payment details
          are collected and stored by Stripe, our payment processor. We receive billing metadata,
          such as subscription status and customer ID, but do not store full payment card numbers on
          our servers.
        </p>
        <p>
          We do not intentionally collect sensitive personal information, such as racial or ethnic
          origin, health data, or religious beliefs, and we do not purchase personal information
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
          <li>Provide, operate, maintain, and improve the Services</li>
          <li>Process subscriptions, payments, and billing</li>
          <li>Generate AI-assisted replies and automations you configure</li>
          <li>Communicate with you about the Services, security, and support</li>
          <li>Detect, prevent, and address fraud, abuse, and security issues</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>
          We do not use account or Service data for advertising or marketing based on individual
          behaviour.
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
            <strong>Service providers</strong> who help us run {PRODUCT_NAME}, including
            Cloudflare (hosting and media delivery), Convex (backend infrastructure), Stripe
            (payments), OpenRouter (AI processing), WorkOS (authentication), PostHog (product
            analytics and feature flags), Google (where you choose Google sign-in), and Meta
            platforms when you connect messaging channels
          </li>
          <li>
            <strong>Business transfers</strong>, such as a merger, acquisition, or sale of assets
          </li>
          <li>
            <strong>Legal requirements</strong>, when we believe disclosure is necessary to comply
            with law, enforce our Terms, or protect rights and safety
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
          providers, including OpenRouter, for processing. These providers process data according
          to their own policies and our agreements with them.
        </p>
        <p>
          For more information about OpenRouter&apos;s handling of personal data, see{' '}
          <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer">
            OpenRouter&apos;s Privacy Policy
          </a>
          .
        </p>
        <p>
          You are responsible for ensuring that content you submit for AI processing complies with
          applicable law and any third-party platform rules, including Meta messaging policies.
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
          We use cookies and similar technologies to operate the Services, keep you signed in,
          remember your preferences, measure product use, and support product features. We do not
          use them for advertising based on individual behaviour.
        </p>
        <p>
          You can control cookies through your browser settings. Disabling essential cookies may
          affect your ability to use the Services.
        </p>
      </>
    ),
  },
];
