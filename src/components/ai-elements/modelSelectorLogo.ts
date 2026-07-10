export function getModelSelectorLogoSource(provider: string, imageUrl?: string) {
  return imageUrl ?? `https://models.dev/logos/${provider}.svg`;
}
