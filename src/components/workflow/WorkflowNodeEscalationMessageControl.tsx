import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type WorkflowNodeEscalationMessageControlProps = {
  agentId: Id<"agents">;
  nodeId: Id<"workflowNodes">;
  enabled?: boolean;
  message?: string;
  disabled: boolean;
  presentation?: "node" | "inspector";
};

export function WorkflowNodeEscalationMessageControl({
  agentId,
  nodeId,
  enabled = false,
  message,
  disabled,
  presentation = "node",
}: WorkflowNodeEscalationMessageControlProps) {
  const updateEscalationMessage = useMutation(
    api.workflowNodeCanvasControls.updateEscalationMessage,
  );
  const subscribedMessage = message ?? "";
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [value, setValue] = useState(subscribedMessage);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsEnabled(enabled);
    setValue(subscribedMessage);
  }, [enabled, subscribedMessage]);

  const save = async (nextEnabled: boolean, nextMessage: string) => {
    setIsSaving(true);
    try {
      await updateEscalationMessage({
        agentId,
        nodeId,
        enabled: nextEnabled,
        message: nextMessage,
      });
    } catch (error) {
      setIsEnabled(enabled);
      setValue(subscribedMessage);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the escalation message",
      );
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isEnabled || !value.trim() || value === subscribedMessage) return;

    const timeout = window.setTimeout(() => {
      void save(true, value);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [isEnabled, subscribedMessage, value]);

  return (
    <div
      className={cn(
        "nodrag nopan mt-3 w-full",
        presentation === "inspector" ? undefined : "border-t border-border pt-3",
      )}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        {presentation === "inspector" ? (
          <h3 className="text-base font-semibold text-foreground">
            Send message before escalating
          </h3>
        ) : (
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`workflow-node-escalation-message-${nodeId}`}
          >
            Send message before escalating
          </label>
        )}
        <Switch
          id={`workflow-node-escalation-message-${nodeId}`}
          checked={isEnabled}
          disabled={disabled || isSaving}
          onCheckedChange={(nextEnabled) => {
            setIsEnabled(nextEnabled);
            if (!nextEnabled || value.trim()) {
              void save(nextEnabled, value);
            }
          }}
          aria-label="Send message before escalating"
        />
      </div>
      {isEnabled ? (
        <Textarea
          aria-label="Message to send before escalating"
          value={value}
          disabled={disabled || isSaving}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Write the message to send"
          className="mt-3 min-h-20 resize-none text-xs leading-relaxed"
        />
      ) : null}
    </div>
  );
}
