import type { LegalSection } from '@/components/LegalDocument';
import {
  LEGAL_ADDRESS,
  LEGAL_EMAIL,
  LEGAL_ENTITY,
} from './legalConstants';

export const termsLegalSections: LegalSection[] = [
  {
    id: 'disclaimers-and-liability',
    title: 'Disclaimers and limitation of liability',
    body: (
      <>
        <h3 className="font-medium text-zinc-900 dark:text-white">Disclaimer of warranties</h3>
        <p>
          The Services are provided strictly on an &quot;as is&quot; and &quot;as available&quot; basis.
          You use the Services at your own risk. To the maximum extent permitted by law, we disclaim
          all conditions, representations, and warranties, whether express, implied, statutory, or
          otherwise, including warranties of merchantability, fitness for a particular purpose, and
          non-infringement of third-party rights. No advice or information obtained from us or
          through the Services creates a warranty not expressly stated in these Terms.
        </p>
        <p>
          Without limiting the preceding paragraph, we do not warrant that content is accurate,
          reliable, or correct; that the Services will meet your requirements; that the Services will
          be available at a particular time or location, uninterrupted, or secure; that defects or
          errors will be corrected; or that the Services are free of viruses or other harmful
          components. Any content you download or otherwise obtain through the Services is obtained
          at your own risk, and you are responsible for damage to your device or loss of data that
          results.
        </p>
        <p>
          We do not warrant, endorse, guarantee, or assume responsibility for a third-party product
          or service advertised or offered through the Services or a linked website or service. We
          are not a party to, and do not monitor, transactions between you and third-party providers.
          The Services may be inaccessible or may not work properly with your browser, device, or
          operating system.
        </p>
        <h3 className="font-medium text-zinc-900 dark:text-white">Limitations of liability</h3>
        <p>
          To the maximum extent permitted by law, neither we nor our subsidiaries, affiliates,
          licensors, officers, directors, agents, partners, suppliers, or employees are liable for
          indirect, punitive, incidental, special, consequential, or exemplary damages, including
          lost profits, goodwill, use, data, or other intangible losses arising from or related to
          the Services or your inability to use them.
        </p>
        <p>
          This includes liability for damage, loss, or injury resulting from hacking, tampering, or
          unauthorized access to the Services, your account, or information in them; errors,
          mistakes, inaccuracies, omissions, or reliance on content; personal injury or property
          damage; unauthorized access to our servers or stored information; interruption of
          transmission; malware; and defamatory, offensive, or unlawful conduct by a user or third
          party.
        </p>
        <p>
          In no event will the aggregate liability of us and our subsidiaries, affiliates,
          licensors, officers, directors, agents, partners, suppliers, or employees exceed the
          amount you paid us in the twelve months before the event giving rise to the claim, or the
          duration of your agreement with us if shorter. This limitation applies whether the claim
          is based on contract, tort, negligence, strict liability, or another basis, even if we
          have been advised that damages are possible.
        </p>
        <p>
          Some jurisdictions do not allow particular exclusions or limitations. The disclaimers,
          exclusions, and limits in these Terms apply only to the extent permitted by applicable
          law and do not limit rights that cannot lawfully be excluded.
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
          You agree to defend, indemnify, and hold harmless {LEGAL_ENTITY}, its subsidiaries,
          affiliates, officers, directors, agents, partners, suppliers, and employees from any
          claim, demand, damage, obligation, loss, liability, cost, debt, or expense, including
          reasonable legal fees, arising from:
        </p>
        <ul>
          <li>Your access to or use of the Services, including transmitted or received data</li>
          <li>Your violation of these Terms or a representation or warranty in them</li>
          <li>Your violation of a third party&apos;s privacy, intellectual property, or other rights</li>
          <li>Your violation of applicable law, rule, or regulation</li>
          <li>
            Content submitted from your account, including by a third party using your credentials,
            and misleading, false, or inaccurate information
          </li>
          <li>Your willful misconduct</li>
          <li>
            Conduct by your affiliates, officers, directors, agents, partners, suppliers, or
            employees, to the extent permitted by applicable law
          </li>
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
          informally. If we cannot resolve a dispute within thirty days, either party may bring
          proceedings in the courts of Malaysia, and you consent to their exclusive jurisdiction.
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
