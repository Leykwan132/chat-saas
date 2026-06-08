import { LegalDocument } from '@/components/LegalDocument';
import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { LEGAL_LAST_UPDATED } from '@/content/legalConstants';
import { termsOfServiceSections } from '@/content/termsOfService';

export default function TermsPage() {
  return (
    <LegalDocumentLayout title="Terms of Service" lastUpdated={LEGAL_LAST_UPDATED}>
      <LegalDocument sections={termsOfServiceSections} />
    </LegalDocumentLayout>
  );
}
