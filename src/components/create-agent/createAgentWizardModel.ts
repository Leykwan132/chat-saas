export type CreateAgentStep = 'identity' | 'goal' | 'creating' | 'success';

export function hasRequiredIdentity(input: {
  name: string;
  businessName: string;
}): boolean {
  return Boolean(input.name.trim() && input.businessName.trim());
}
