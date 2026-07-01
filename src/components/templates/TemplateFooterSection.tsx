import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { createTemplateInputClass } from './templateBuilderConstants';

type TemplateFooterSectionProps = {
  enabled: boolean;
  footerText: string;
  onEnabledChange: (enabled: boolean) => void;
  onFooterTextChange: (text: string) => void;
};

export function TemplateFooterSection({
  enabled,
  footerText,
  onEnabledChange,
  onFooterTextChange,
}: TemplateFooterSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-3xs">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-base font-semibold text-foreground">Footer</h2>
          <p className="m-0 text-xs text-muted-foreground">
            Optional grey text shown below the message body.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <Field className="gap-2">
          <FieldLabel htmlFor="footer-text">Footer text</FieldLabel>
          <Input
            id="footer-text"
            value={footerText}
            onChange={(event) => onFooterTextChange(event.target.value)}
            placeholder="e.g. Reply STOP to opt out."
            maxLength={60}
            className={createTemplateInputClass}
          />
          <FieldDescription className="self-end text-xs">
            {footerText.length}/60 chars
          </FieldDescription>
        </Field>
      )}
    </section>
  );
}
