import { ArrowLeft, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { hasRequiredIdentity } from './createAgentWizardModel';

type CreateAgentIdentityStepProps = {
  name: string;
  businessName: string;
  businessDescription: string;
  onNameChange: (value: string) => void;
  onBusinessNameChange: (value: string) => void;
  onBusinessDescriptionChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function CreateAgentIdentityStep({
  name,
  businessName,
  businessDescription,
  onNameChange,
  onBusinessNameChange,
  onBusinessDescriptionChange,
  onBack,
  onContinue,
}: CreateAgentIdentityStepProps) {
  const canContinue = hasRequiredIdentity({ name, businessName });

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (canContinue) onContinue();
      }}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Tell us who your agent represents
        </h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll use this context to prepare the agent&apos;s instructions.
        </p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="agent-name">Agent name</FieldLabel>
          <Input
            id="agent-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e.g. Maya"
            autoFocus
            autoComplete="off"
          />
          <FieldDescription>You can change this later.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="business-name">Business name</FieldLabel>
          <Input
            id="business-name"
            value={businessName}
            onChange={(event) => onBusinessNameChange(event.target.value)}
            placeholder="e.g. Northstar Dental"
            autoComplete="organization"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="business-description">
            Business description <span className="text-muted-foreground">Optional</span>
          </FieldLabel>
          <Textarea
            id="business-description"
            value={businessDescription}
            onChange={(event) => onBusinessDescriptionChange(event.target.value)}
            placeholder="What does the business offer, and who does it serve?"
            rows={4}
          />
          <FieldDescription>
            A short description helps the agent give more relevant answers.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <Button type="submit" disabled={!canContinue}>
          Continue
          <CornerDownLeft data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}
