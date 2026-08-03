import type { LegalSection } from '@/components/LegalDocument';
import { privacyPolicyProviderSections } from './privacyPolicyProviderSections';
import { privacyPolicyRightsSections } from './privacyPolicyRightsSections';
import { privacyPolicyServiceSections } from './privacyPolicyServiceSections';

export const privacyPolicySections: LegalSection[] = [
  ...privacyPolicyServiceSections,
  ...privacyPolicyProviderSections,
  ...privacyPolicyRightsSections,
];
