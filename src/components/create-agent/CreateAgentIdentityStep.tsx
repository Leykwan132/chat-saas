import { useRef, useState } from 'react';
import { ArrowLeft, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getIdentityValidation } from './createAgentWizardModel';

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
  const [showValidation, setShowValidation] = useState(false);
  const agentNameInputRef = useRef<HTMLInputElement>(null);
  const businessNameInputRef = useRef<HTMLInputElement>(null);
  const validation = getIdentityValidation({ name, businessName });
  const agentNameError = showValidation ? validation.agentNameError : null;
  const businessNameError = showValidation ? validation.businessNameError : null;

  return (
    <form
      className="flex flex-col gap-8"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setShowValidation(true);
        if (validation.firstInvalidField === 'agent-name') {
          agentNameInputRef.current?.focus();
          return;
        }
        if (validation.firstInvalidField === 'business-name') {
          businessNameInputRef.current?.focus();
          return;
        }
        onContinue();
      }}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Let&apos;s set up your agent
        </h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll use this context to prepare the agent&apos;s instructions.
        </p>
      </div>

      <FieldGroup>
        <Field data-invalid={agentNameError ? true : undefined}>
          <FieldLabel htmlFor="agent-name">
            <span>Agent name</span>
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
            <span className="sr-only">required</span>
          </FieldLabel>
          <Input
            id="agent-name"
            ref={agentNameInputRef}
            required
            aria-required="true"
            aria-invalid={agentNameError ? true : undefined}
            aria-describedby={
              agentNameError
                ? 'agent-name-description agent-name-error'
                : 'agent-name-description'
            }
            value={name}
            onChange={(event) => {
              onNameChange(event.target.value);
            }}
            placeholder="e.g. Maya"
            autoFocus
            autoComplete="off"
          />
          <FieldDescription id="agent-name-description">
            You can change this later.
          </FieldDescription>
          {agentNameError ? (
            <FieldError id="agent-name-error">{agentNameError}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={businessNameError ? true : undefined}>
          <FieldLabel htmlFor="business-name">
            <span>Business name</span>
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
            <span className="sr-only">required</span>
          </FieldLabel>
          <Input
            id="business-name"
            ref={businessNameInputRef}
            required
            aria-required="true"
            aria-invalid={businessNameError ? true : undefined}
            aria-describedby={businessNameError ? 'business-name-error' : undefined}
            value={businessName}
            onChange={(event) => {
              onBusinessNameChange(event.target.value);
            }}
            placeholder="e.g. Northstar Dental"
            autoComplete="organization"
          />
          {businessNameError ? (
            <FieldError id="business-name-error">{businessNameError}</FieldError>
          ) : null}
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
            rows={5}
          />
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <Button type="submit">
          Continue
          <CornerDownLeft data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}
