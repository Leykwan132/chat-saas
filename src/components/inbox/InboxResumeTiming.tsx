import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

export function InboxResumeTiming({
  minutes,
  disabled,
  onMinutesChange,
}: {
  minutes: string;
  disabled: boolean;
  onMinutesChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>Resume in (minutes)</FieldLabel>
      <Input
        id={id}
        autoFocus
        disabled={disabled}
        type="number"
        min={1}
        max={10080}
        step={1}
        value={minutes}
        onChange={(event) => onMinutesChange(event.target.value)}
      />
    </Field>
  );
}
