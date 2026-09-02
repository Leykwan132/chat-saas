import type { LegalSection } from '@/components/LegalDocument';

export const termsUserContentSections: LegalSection[] = [
  {
    id: 'your-content',
    title: 'Your content',
    body: (
      <>
        <p>
          You may upload, share, or otherwise provide content through the Services, including
          knowledge base materials, agent configurations, messages, customer records, and other
          data (&quot;Your Content&quot;). You represent that you have the legal right to provide Your
          Content and that it does not violate applicable law or a third party&apos;s rights.
        </p>
        <p>
          You retain ownership of Your Content. You grant us a worldwide, non-exclusive, fully
          paid-up, royalty-free licence to host, store, process, display, transmit, maintain,
          improve, and secure Your Content solely to operate and maintain the Services as these
          Terms require. To the extent permitted by law, you waive moral rights relating to Your
          Content.
        </p>
        <p>
          You are solely responsible for Your Content and for content submitted from your account,
          including when another person uses your credentials. We do not have an obligation to
          pre-screen, filter, or moderate Your Content.
        </p>
        <p>
          We may remove, delete, block, rectify, or restrict access to Your Content or your account
          without prior notice if we receive a complaint, an intellectual-property infringement
          notice, or an order from a public authority, or if we become aware that the content may
          create a risk to users, third parties, or the Services. To the extent permitted by law,
          those actions do not give you a right to compensation, damages, or reimbursement.
        </p>
      </>
    ),
  },
  {
    id: 'content-backups',
    title: 'Content backups',
    body: (
      <>
        <p>
          We may perform regular backups of Content, but do not guarantee that Content will never
          be lost or corrupted, that a backup point is valid, or that Content can be restored to a
          usable state. Content may already be corrupted before backup or may change while a backup
          is performed.
        </p>
        <p>
          We will provide support and try to troubleshoot known backup issues, but, to the extent
          permitted by law, are not liable for the integrity of Content or a failure to restore it.
          You must maintain a complete and accurate independent copy of Your Content.
        </p>
      </>
    ),
  },
  {
    id: 'google-workspace-api-data',
    title: 'Google Workspace API data',
    body: (
      <p>
        The use of raw or derived user data received from Workspace APIs will adhere to the Google
        User Data Policy, including the Limited Use requirements.
      </p>
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
          AI features may send conversation context and related data to third-party providers,
          including OpenRouter. You must comply with their applicable terms and policies. We do not
          guarantee that AI features will meet your requirements or produce error-free results.
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
          requirements, opt-out rules, and industry-specific regulations that apply to your
          communications. We are not responsible for actions taken by third-party platforms,
          including account restrictions, message delivery failures, or enforcement against your
          connected accounts.
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
          <li>Scrape, crawl, or systematically extract data without permission</li>
          <li>Circumvent security, access controls, or usage limits</li>
          <li>Reverse engineer, decompile, or copy the Services except where law permits</li>
          <li>Upload malware, spam, or material that disrupts the Services</li>
          <li>Impersonate another person or misrepresent your affiliation</li>
          <li>Harass our team or other users</li>
          <li>Use automated tools except through documented APIs we provide</li>
          <li>Send unsolicited messages or violate applicable anti-spam laws</li>
        </ul>
        <p>
          We may investigate violations and remove content, suspend accounts, or take legal action
          as appropriate.
        </p>
      </>
    ),
  },
];
