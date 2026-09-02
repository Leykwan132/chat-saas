import { useState } from "react";
import { PartnerRoleSelect } from "@/components/partner/PartnerCustomerControls";
import { Spinner } from "@/components/ui/spinner";
import { type PartnerOverview } from "@/lib/whiteLabelApi";

type Customer = PartnerOverview["customers"][number];

export function PartnerCustomerRoleControl({
  customer,
  onRoleChange,
}: {
  customer: Customer;
  onRoleChange: (customer: Customer, role: Customer["role"]) => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const canChangeRole =
    customer.invitationStatus === "active" && customer.workosUserId !== undefined;

  const changeRole = async (role: Customer["role"]) => {
    if (role === customer.role) return;
    setIsSaving(true);
    try {
      await onRoleChange(customer, role);
    } finally {
      setIsSaving(false);
    }
  };

  if (!canChangeRole) {
    return <span className="capitalize">{customer.role}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <PartnerRoleSelect
        compact
        disabled={isSaving}
        value={customer.role}
        onValueChange={(role) => void changeRole(role)}
      />
      {isSaving ? <Spinner className="size-3.5" /> : null}
    </div>
  );
}
