import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type PartnerOverview, type PlanKey } from "@/lib/whiteLabelApi";

const planOptions: PlanKey[] = ["free", "starter", "growth", "business"];
const fullWidthSelectClassName = "w-full text-sm";

export function PartnerOrganizationSelect({
  id,
  organizations,
  value,
  onValueChange,
}: {
  id: string;
  organizations: PartnerOverview["organizations"];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={fullWidthSelectClassName}>
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {organizations.map((organization) => (
            <SelectItem
              key={organization.partnerOrganizationId}
              value={organization.partnerOrganizationId}
              className="text-sm"
            >
              {organization.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function PartnerPlanSelect({
  id,
  value,
  onValueChange,
  compact = false,
}: {
  id?: string;
  value: PlanKey;
  onValueChange: (value: PlanKey) => void;
  compact?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as PlanKey)}
    >
      <SelectTrigger
        id={id}
        className={compact ? "w-28 text-sm" : fullWidthSelectClassName}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {planOptions.map((plan) => (
            <SelectItem key={plan} value={plan} className="capitalize text-sm">
              {plan}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function PartnerRoleSelect({
  value,
  onValueChange,
}: {
  value: "owner" | "admin" | "member";
  onValueChange: (value: "owner" | "admin" | "member") => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) =>
        onValueChange(nextValue as "owner" | "admin" | "member")
      }
    >
      <SelectTrigger id="customer-role" className={fullWidthSelectClassName}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="owner" className="text-sm">
            Owner
          </SelectItem>
          <SelectItem value="admin" className="text-sm">
            Admin
          </SelectItem>
          <SelectItem value="member" className="text-sm">
            Member
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
