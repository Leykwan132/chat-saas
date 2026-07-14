import type { Doc } from "../_generated/dataModel";
import type { CollectedFields } from "./types";

function trimmedField(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function manualBookingFieldsForCustomer(
  customer: Doc<"customers">,
  submittedFields: CollectedFields,
): CollectedFields {
  const name = trimmedField(customer.name)
    ?? trimmedField(customer.email)
    ?? trimmedField(customer.phone)
    ?? customer.contactAddress.trim();
  const phone = trimmedField(customer.phone);
  const email = trimmedField(customer.email);
  return {
    date: typeof submittedFields.date === "string" ? submittedFields.date : "",
    time: typeof submittedFields.time === "string" ? submittedFields.time : "",
    name,
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
  };
}
