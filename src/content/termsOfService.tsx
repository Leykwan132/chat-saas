import { Link } from 'react-router';
import type { LegalSection } from '@/components/LegalDocument';
import {
  LEGAL_ADDRESS,
  LEGAL_EMAIL,
  LEGAL_ENTITY,
  PRODUCT_NAME,
  PRODUCT_URL,
} from './legalConstants';

export const termsOfServiceSections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement to these terms',
    body: (
      <>
        <p>
          These Terms of Service (&quot;Terms&quot;) are a binding agreement between you and{' '}
          {LEGAL_ENTITY} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). They govern your
          access to and use of {PRODUCT_NAME} at{' '}
          <a href={PRODUCT_URL} target="_blank" rel="noopener noreferrer">
            {PRODUCT_URL.replace('https://', '')}
          </a>{' '}
          and related products and services (collectively, the &quot;Services&quot;).
        </p>
        <p>
          By accessing or using the Services, you agree to these Terms and our{' '}
          <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Services.
        </p>
        <p>
          We may update these Terms by changing the &quot;Last updated&quot; date. Continued use
          after changes means you accept the revised Terms. Contact us at{' '}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> or by mail at {LEGAL_ADDRESS.line1},{' '}
          {LEGAL_ADDRESS.city}, {LEGAL_ADDRESS.state} {LEGAL_ADDRESS.postalCode},{' '}
          {LEGAL_ADDRESS.country}.
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
          The Services are not intended for use in jurisdictions where such use would violate local
          law. If you access the Services from outside Malaysia, you are responsible for compliance
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
          <li>Will provide accurate account information and keep it up to date</li>
          <li>Will not use the Services for illegal or unauthorized purposes</li>
          <li>Will comply with all applicable laws and regulations</li>
        </ul>
        <p>
          Accounts are authenticated through WorkOS AuthKit. You are responsible for safeguarding
          your login credentials and for all activity under your account. Notify us immediately if
          you suspect unauthorized access.
        </p>
        <p>
          We may suspend or terminate accounts that provide false information or violate these
          Terms.
        </p>
      </>
    ),
  },
  {
    id: 'subscriptions-and-billing',
    title: 'Subscriptions, billing, and credits',
    body: (
      <>
        <p>
          Some features require a paid subscription. Fees, plan limits, and billing intervals are
          shown on our pricing page and at checkout. Payments are processed by Stripe.
        </p>
        <p>
          Paid subscriptions renew automatically until cancelled. You may cancel through your account
          or billing settings. Cancellation stops future charges but does not entitle you to a
          refund for the current billing period unless required by law.
        </p>
        <p>
          Plans may include usage limits such as monthly credits, team members, or connected
          channels. If you exceed limits, certain features may be restricted until you upgrade or
          the next billing cycle begins.
        </p>
        <p>
          We may change pricing or plan features with reasonable notice where required. Price changes
          apply to subsequent billing periods.
        </p>
      </>
    ),
  },
  {
    id: 'your-content',
    title: 'Your content',
    body: (
      <>
        <p>
          You may upload or submit content through the Services, including knowledge base materials,
          agent configurations, messages, customer records, and other data (&quot;Your Content&quot;).
        </p>
        <p>
          You retain ownership of Your Content. You grant us a worldwide, non-exclusive license to
          host, store, process, display, and transmit Your Content solely to operate, improve, and
          secure the Services.
        </p>
        <p>
          You represent that you have all rights needed to submit Your Content and that it does not
          violate any law or third-party rights. You are solely responsible for Your Content and
          for messages sent through connected channels on your behalf.
        </p>
        <p>
          Feedback you send us may be used without restriction or compensation to you.
        </p>
      </>
    ),
  },
  {
    id: 'ai-features',
    title: 'AI-powered features',
    body: (
      <>
        <p>
          The Services include AI-generated replies, summaries, and automations. AI output may be
          inaccurate, incomplete, or inappropriate. You are responsible for reviewing AI-generated
          content before it reaches customers or the public.
        </p>
        <p>
          AI features may send conversation context and related data to third-party providers
          (including OpenRouter). You must comply with their applicable terms and policies.
        </p>
        <p>
          We do not guarantee that AI features will meet your requirements or produce error-free
          results.
        </p>
      </>
    ),
  },
  {
    id: 'connected-channels',
    title: 'Connected messaging channels',
    body: (
      <>
        <p>
          You may connect third-party messaging platforms such as WhatsApp, Instagram, or Messenger
          through Meta. By connecting a channel, you represent that you have authority to use that
          account and to message recipients through it.
        </p>
        <p>
          You are responsible for compliance with Meta platform policies, messaging laws, consent
          requirements, opt-out rules, and any industry-specific regulations that apply to your
          communications.
        </p>
        <p>
          We are not responsible for actions taken by third-party platforms, including account
          restrictions, message delivery failures, or enforcement against your connected accounts.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Services for unlawful, harmful, fraudulent, or abusive purposes</li>
          <li>Scrape, crawl, or systematically extract data from the Services without permission</li>
          <li>Circumvent security, access controls, or usage limits</li>
          <li>Reverse engineer, decompile, or copy the Services except where permitted by law</li>
          <li>Upload malware, spam, or material that disrupts the Services</li>
          <li>Impersonate others or misrepresent your affiliation</li>
          <li>Harass our team or other users</li>
          <li>Use automated tools to access the Services except through documented APIs we provide</li>
          <li>Resell, sublicense, or compete with the Services using our platform without authorization</li>
          <li>Send unsolicited messages or use the Services in violation of applicable anti-spam laws</li>
        </ul>
        <p>
          We may investigate violations and remove content, suspend accounts, or take legal action
          as appropriate.
        </p>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Our intellectual property',
    body: (
      <>
        <p>
          The Services, including software, design, branding, and documentation (excluding Your
          Content), are owned by us or our licensors and protected by intellectual property laws.
        </p>
        <p>
          Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable
          license to access and use the Services for your internal business purposes.
        </p>
        <p>
          You may not copy, modify, distribute, sell, or create derivative works from the Services
          without our prior written consent. Unauthorized use may result in immediate termination.
        </p>
      </>
    ),
  },
  {
    id: 'termination',
    title: 'Term, suspension, and termination',
    body: (
      <>
        <p>
          These Terms remain in effect while you use the Services. We may suspend or terminate your
          access at any time, with or without notice, for violation of these Terms, legal
          requirements, or risk to the Services or other users.
        </p>
        <p>
          You may stop using the Services at any time. Upon termination, your right to access the
          Services ends. Provisions that by nature should survive (including payment obligations,
          disclaimers, liability limits, and indemnity) will survive termination.
        </p>
        <p>
          If your account is terminated for cause, you may not create a new account without our
          permission.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimers-and-liability',
    title: 'Disclaimers and limitation of liability',
    body: (
      <>
        <p>
          THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
          OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p>
          WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT
          AI OUTPUT OR THIRD-PARTY INTEGRATIONS WILL BE ACCURATE OR RELIABLE.
        </p>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA,
          OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICES.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICES WILL NOT
          EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO
          THE CLAIM, OR MYR 100 IF YOU HAVE NOT PAID US.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations. In those cases, our liability is
          limited to the maximum extent permitted by law.
        </p>
      </>
    ),
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    body: (
      <>
        <p>
          You agree to defend, indemnify, and hold harmless {LEGAL_ENTITY} and its officers,
          directors, employees, and agents from claims, damages, losses, and expenses (including
          reasonable legal fees) arising from:
        </p>
        <ul>
          <li>Your use of the Services</li>
          <li>Your Content or messages sent through connected channels</li>
          <li>Your violation of these Terms or applicable law</li>
          <li>Your violation of third-party rights, including intellectual property or privacy rights</li>
        </ul>
      </>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing law and disputes',
    body: (
      <>
        <p>
          These Terms are governed by the laws of Malaysia, without regard to conflict-of-law
          principles.
        </p>
        <p>
          Before filing a claim, you agree to contact us at{' '}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> and attempt to resolve the dispute
          informally. If we cannot resolve a dispute within thirty (30) days, either party may
          bring proceedings in the courts of Malaysia, and you consent to the exclusive jurisdiction
          of those courts.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <>
        <p>Questions about these Terms? Contact us:</p>
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
