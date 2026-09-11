import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PLAN_CATALOG } from "../../../shared/planCatalog";
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
        <SelectValue>{PLAN_CATALOG[value].name}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {planOptions.map((plan) => (
            <SelectItem key={plan} value={plan} className="text-sm">
              {PLAN_CATALOG[plan].name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function PartnerModelSelect({
  id,
  value,
  models,
  compact = false,
  disabled = false,
  "aria-label": ariaLabel,
  onValueChange,
}: {
  id?: string;
  value: string;
  models: Array<{ value: string; label: string }> | undefined;
  compact?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  onValueChange: (value: string) => void;
}) {
  const selected = models?.find((model) => model.value === value);
  return (
    <Select
      disabled={disabled || models === undefined}
      value={value}
      onValueChange={onValueChange}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={compact ? "w-44 text-sm" : fullWidthSelectClassName}
      >
        <SelectValue>{selected?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {(models ?? []).map((model) => (
            <SelectItem key={model.value} value={model.value} className="text-sm">
              {model.label}
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
  compact = false,
  disabled = false,
}: {
  value: "owner" | "admin" | "member";
  onValueChange: (value: "owner" | "admin" | "member") => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(nextValue) =>
        onValueChange(nextValue as "owner" | "admin" | "member")
      }
    >
      <SelectTrigger
        id="customer-role"
        className={compact ? "w-28 text-sm" : fullWidthSelectClassName}
      >
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

export function PartnerLimitInput({
  id,
  value,
  compact = false,
  disabled = false,
  "aria-label": ariaLabel,
  onCommit,
  onValueChange,
}: {
  id?: string;
  value: number;
  compact?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  onCommit?: (value: number) => void;
  onValueChange?: (value: number) => void;
}) {
  const className = compact
    ? "h-8 w-20 text-center text-sm"
    : fullWidthSelectClassName;
  const commit = (raw: string, restore: HTMLInputElement) => {
    const next = Number(raw);
    if (!Number.isSafeInteger(next) || next < 1) {
      restore.value = String(value);
      return;
    }
    if (onValueChange && next !== value) onValueChange(next);
    if (onCommit && next !== value) onCommit(next);
  };

  if (onCommit) {
    return (
      <Input
        id={id}
        aria-label={ariaLabel}
        key={value}
        className={className}
        defaultValue={value}
        disabled={disabled}
        inputMode="numeric"
        min={1}
        type="number"
        onBlur={(event) => commit(event.currentTarget.value, event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    );
  }

  return (
    <Input
      id={id}
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      inputMode="numeric"
      min={1}
      type="number"
      value={value}
      onChange={(event) => {
        const next = Number(event.currentTarget.value);
        if (Number.isSafeInteger(next) && next >= 1) onValueChange?.(next);
      }}
    />
  );
}
