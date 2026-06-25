const WHATSAPP_SKIP_CONTACT_PHONES = new Set([
  "447710173736", // Meta official system account
]);

export function normalizeWhatsAppPhone(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isSkippedWhatsAppContact(address: string | undefined): boolean {
  const digits = normalizeWhatsAppPhone(address);
  return digits.length > 0 && WHATSAPP_SKIP_CONTACT_PHONES.has(digits);
}
