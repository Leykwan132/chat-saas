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
  const canContinue = hasRequiredIdentity({ name, businessName, businessDescription });

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (canContinue) onContinue();
      }}
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          About your agent
        </h1>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="agent-name">
            <span>Agent name</span>
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
            <span className="sr-only">required</span>
          </FieldLabel>
          <Input
            id="agent-name"
            required
            aria-required="true"
            aria-describedby="agent-name-description"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e.g. Maya"
            autoFocus
            autoComplete="off"
          />
          <FieldDescription id="agent-name-description">
            You can change this later.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="business-name">
            <span>Business name</span>
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
            <span className="sr-only">required</span>
          </FieldLabel>
          <Input
            id="business-name"
            required
            aria-required="true"
            value={businessName}
            onChange={(event) => onBusinessNameChange(event.target.value)}
            placeholder="e.g. Northstar Dental"
            autoComplete="organization"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="business-description">
            <span>Business description</span>
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
            <span className="sr-only">required</span>
          </FieldLabel>
          <Textarea
            id="business-description"
            required
            aria-required="true"
            value={businessDescription}
            onChange={(event) => onBusinessDescriptionChange(event.target.value)}
            placeholder="What does the business offer, and who does it serve?"
            rows={4}
          />
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
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
