export function getPriceLevel(creditCost: number): number {
  if (creditCost <= 1) return 1;
  if (creditCost <= 3) return 2;
  if (creditCost <= 8) return 3;
  return 4;
}
