import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PartnerModeSelect({
  id,
  value,
  disabled,
  compact,
  onValueChange,
}: {
  id?: string;
  value: "normal" | "focus";
  disabled?: boolean;
  compact?: boolean;
  onValueChange: (value: "normal" | "focus") => void;
}) {
  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(value) => onValueChange(value as "normal" | "focus")}
    >
      <SelectTrigger
        id={id}
        aria-label="User mode"
        className={compact ? "w-28 text-sm" : "w-full text-sm"}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="normal" className="text-sm">
            Normal
          </SelectItem>
          <SelectItem value="focus" className="text-sm">
            Focus
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
