import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type WebWidgetLeadFormSelectProps = {
  className?: string;
  defaultValue?: string;
  id?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: string[];
  required: boolean;
  value?: string;
};

export function WebWidgetLeadFormSelect({
  className,
  defaultValue,
  id,
  name,
  onValueChange,
  options,
  required,
  value,
}: WebWidgetLeadFormSelectProps) {
  return (
    <Select
      defaultValue={defaultValue}
      name={name}
      required={required}
      value={value}
      onValueChange={onValueChange}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "widget-lead-form-select-trigger h-10 w-full rounded-lg border-border bg-transparent px-3 text-sm font-normal",
          className,
        )}
      >
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
