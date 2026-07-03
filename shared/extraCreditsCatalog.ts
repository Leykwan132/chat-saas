export const EXTRA_CREDITS_PACK_NOTE =
  "Extra credit will be carried forward and won't expire.";

export const EXTRA_CREDITS_PACKS = [
  {
    id: "credits_2000",
    credits: 2000,
    priceRm: 49,
  },
  {
    id: "credits_5000",
    credits: 5000,
    priceRm: 99,
  },
  {
    id: "credits_15000",
    credits: 15000,
    priceRm: 249,
  },
] as const;

export type ExtraCreditsPack = (typeof EXTRA_CREDITS_PACKS)[number];
export type ExtraCreditsPackId = ExtraCreditsPack["id"];

export const EXTRA_CREDITS_PACKS_BY_ID = Object.fromEntries(
  EXTRA_CREDITS_PACKS.map((pack) => [pack.id, pack]),
) as Record<ExtraCreditsPackId, ExtraCreditsPack>;

export function getExtraCreditsPack(packId: ExtraCreditsPackId): ExtraCreditsPack {
  return EXTRA_CREDITS_PACKS_BY_ID[packId];
}

export function formatExtraCreditsPackPrice(pack: ExtraCreditsPack): string {
  return `RM ${pack.priceRm.toLocaleString()}`;
}
