import type { Doc } from "./_generated/dataModel";
import { ensureWhatsAppRecipientPhone } from "./whatsappPhone";

export type WhatsAppRecipient =
  | { recipient: string; to?: never }
  | { to: string; recipient?: never };

export function buildWhatsAppRecipient(
  customer: Pick<
    Doc<"customers">,
    "contactAddress" | "phone" | "whatsappUserId"
  >,
): WhatsAppRecipient {
  const whatsappUserId = customer.whatsappUserId?.trim();
  if (whatsappUserId) {
    return { recipient: whatsappUserId };
  }

  const phone = customer.phone?.trim() || customer.contactAddress.trim();
  if (!phone) {
    throw new Error("Customer has no WhatsApp recipient");
  }
  return { to: ensureWhatsAppRecipientPhone(phone) };
}
