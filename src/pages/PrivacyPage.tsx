import { LegalDocument } from '@/components/LegalDocument';
import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { LEGAL_LAST_UPDATED } from '@/content/legalConstants';
import { privacyPolicySections } from '@/content/privacyPolicy';

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout title="Privacy Policy" lastUpdated={LEGAL_LAST_UPDATED}>
      <LegalDocument sections={privacyPolicySections} />
    </LegalDocumentLayout>
  );
}
