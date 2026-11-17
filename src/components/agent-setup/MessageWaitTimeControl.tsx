import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

type SettingsProps = { agentId: Id<"agents">; disabled?: boolean };

export function MessageWaitTimeSettings({ agentId, disabled }: SettingsProps) {
  const messageWaitSeconds = useQuery(api.messageWaitSettings.get, { agentId });
  if (messageWaitSeconds === undefined)
    return <Skeleton className="h-20 w-full" />;
  return (
    <MessageWaitTimeControl
      key={`${agentId}-${messageWaitSeconds}`}
      agentId={agentId}
      messageWaitSeconds={messageWaitSeconds}
      disabled={disabled}
    />
  );
}

export function MessageWaitTimeControl({
  agentId,
  messageWaitSeconds,
  disabled = false,
}: SettingsProps & { messageWaitSeconds: number }) {
  const update = useMutation(api.messageWaitSettings.update);
  const [seconds, setSeconds] = useState(String(messageWaitSeconds));
  const [savedSeconds, setSavedSeconds] = useState(messageWaitSeconds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const numericSeconds = Number(seconds);
  const valid =
    seconds.trim() !== "" &&
    Number.isInteger(numericSeconds) &&
    numericSeconds >= 0 &&
    numericSeconds <= 60;
  const unavailable = disabled || saving;
  const canSave = !unavailable && valid && numericSeconds !== savedSeconds;
  const inputId = `message-wait-seconds-${agentId}`;
  const descriptionId = `${inputId}-description`;
  const validationId = `${inputId}-validation`;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(undefined);
    try {
      await update({ agentId, messageWaitSeconds: numericSeconds });
      setSavedSeconds(numericSeconds);
      toast.success("Message wait time saved");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Could not save message wait time";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Field
      data-invalid={!valid}
      data-disabled={unavailable}
      className="gap-2.5"
    >
      <div className="flex flex-col gap-0.5">
        <FieldLabel htmlFor={inputId}>Message wait time (seconds)</FieldLabel>
        <FieldDescription id={descriptionId}>
          Wait after the latest customer message to group messages into one
          reply. Choose 0 for immediate replies.
        </FieldDescription>
      </div>
      <Input
        id={inputId}
        type="number"
        min={0}
        max={60}
        step={1}
        value={seconds}
        disabled={unavailable}
        aria-invalid={!valid}
        aria-describedby={`${descriptionId}${!valid ? ` ${validationId}` : ""}`}
        onChange={(event) => {
          setSeconds(event.target.value);
          setError(undefined);
        }}
      />
      {!valid ? (
        <p
          id={validationId}
          role="alert"
          className="m-0 text-sm text-destructive"
        >
          Choose a whole number of seconds between 0 and 60.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant={canSave ? "default" : "outline"}
          disabled={!canSave}
          aria-label="Save message wait time"
          onClick={() => {
            void save();
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Field>
  );
}
