export type CustomerSearchSource = {
  name?: string;
  email?: string;
  phone?: string;
  contactAddress: string;
};

const MAX_SUFFIX_SOURCE_LENGTH = 64;
const MAX_SUFFIX_LENGTH = 32;

function searchableSuffixes(value: string) {
  const suffixes: string[] = [];
  const words = value.match(/[\p{L}\p{N}]+/gu) ?? [];
  for (const word of words) {
    const characters = Array.from(word).slice(0, MAX_SUFFIX_SOURCE_LENGTH);
    for (let index = 0; index < characters.length; index += 1) {
      suffixes.push(characters.slice(index, index + MAX_SUFFIX_LENGTH).join(""));
    }
  }
  return suffixes;
}

export function customerSearchText(customer: CustomerSearchSource) {
  const identityValues = [customer.name, customer.email, customer.phone, customer.contactAddress]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
  const searchTerms = new Set(identityValues);
  for (const value of identityValues) {
    for (const suffix of searchableSuffixes(value)) {
      searchTerms.add(suffix);
    }
  }
  return Array.from(searchTerms).join(" ");
}
