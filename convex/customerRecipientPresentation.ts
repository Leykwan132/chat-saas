export function customerRecipientLabel(customer: {
  contactAddress: string;
  phone?: string;
  whatsappUsername?: string;
}) {
  return (
    customer.whatsappUsername?.trim() ||
    customer.phone?.trim() ||
    customer.contactAddress.trim()
  );
}
