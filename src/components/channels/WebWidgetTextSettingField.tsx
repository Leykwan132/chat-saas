import {
  Field,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type WebWidgetTextSettingFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

export function WebWidgetTextSettingField({
  id,
  label,
  value,
  placeholder,
  onChange,
  onSubmit,
}: WebWidgetTextSettingFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit?.();
        }}
      />
    </Field>
  );
}
