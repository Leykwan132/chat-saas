export const REFERRAL_CODE_MAX_LENGTH = 13;
export const REFERRAL_CODE_PATTERN = /^KILO-[A-HJ-NP-Z2-9]{8}$/;

export type ReferralCodeInputState =
  | 'empty'
  | 'incomplete'
  | 'invalid'
  | 'complete';

export function normalizeReferralCodeInput(value: string) {
  return value
    .toUpperCase()
    .replace(/\s/g, '')
    .slice(0, REFERRAL_CODE_MAX_LENGTH);
}

export function getReferralCodeInputState(
  value: string,
): ReferralCodeInputState {
  if (!value) {
    return 'empty';
  }
  if (REFERRAL_CODE_PATTERN.test(value)) {
    return 'complete';
  }
  if (value.length < REFERRAL_CODE_MAX_LENGTH) {
    if (value.length <= 5 && 'KILO-'.startsWith(value)) {
      return 'incomplete';
    }
    if (value.startsWith('KILO-') && /^[A-HJ-NP-Z2-9]*$/.test(value.slice(5))) {
      return 'incomplete';
    }
  }
  return 'invalid';
}
