import { useState } from "react";
import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";

const updateMode = makeFunctionReference<
  "mutation",
  {
    partnerOrganizationId: Id<"whiteLabelPartnerOrganizations">;
    workosUserId: string;
    interfaceMode: "normal" | "focus";
  },
  null
>("whiteLabel/customerInterfaceMode:update");

export function PartnerCustomerModeControl({
  customer,
}: {
  customer: {
    partnerOrganizationId: string;
    workosUserId?: string;
    interfaceMode?: "normal" | "focus";
    invitationStatus: string;
  };
}) {
  const update = useMutation(updateMode);
  const [saving, setSaving] = useState(false);
  const change = async (interfaceMode: "normal" | "focus") => {
    if (!customer.workosUserId) return;
    setSaving(true);
    try {
      await update({
        partnerOrganizationId:
          customer.partnerOrganizationId as Id<"whiteLabelPartnerOrganizations">,
        workosUserId: customer.workosUserId,
        interfaceMode,
      });
      toast.success("User mode updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update user mode",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <select
      aria-label="User mode"
      className="h-9 rounded-md border border-border bg-background px-2 text-sm"
      disabled={
        saving ||
        customer.invitationStatus !== "active" ||
        !customer.workosUserId
      }
      value={customer.interfaceMode ?? "normal"}
      onChange={(event) =>
        void change(event.target.value as "normal" | "focus")
      }
    >
      <option value="normal">Normal</option>
      <option value="focus">Focus</option>
    </select>
  );
}
