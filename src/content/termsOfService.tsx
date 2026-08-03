import type { LegalSection } from '@/components/LegalDocument';
import { termsAgreementSections } from './termsAgreementSections';
import { termsCommercialSections } from './termsCommercialSections';
import { termsLegalSections } from './termsLegalSections';
import { termsLifecycleSections } from './termsLifecycleSections';
import { termsUserContentSections } from './termsUserContentSections';

export const termsOfServiceSections: LegalSection[] = [
  ...termsAgreementSections,
  ...termsCommercialSections,
  ...termsUserContentSections,
  ...termsLifecycleSections,
  ...termsLegalSections,
];
