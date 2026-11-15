import { MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Props = {
  agentId: Id<"agents">;
  nodeId: Id<"workflowNodes">;
  enabled?: boolean;
  mode?: "ai" | "manual";
  message?: string;
  disabled: boolean;
  presentation?: "node" | "inspector";
};

export function WorkflowNodeEscalationMessageControl(props: Props) {
  return <CustomEscalationMessageEditor key={`${props.nodeId}-${props.enabled}-${props.mode}-${props.message}`} {...props} />;
}

function CustomEscalationMessageEditor({ agentId, nodeId, enabled = false, mode = "manual", message = "", disabled, presentation = "node" }: Props) {
  const update = useMutation(api.workflowNodeCanvasControls.updateEscalationMessage);
  const savedCustomEnabled = enabled && mode === "manual";
  const [customEnabled, setCustomEnabled] = useState(savedCustomEnabled);
  const [value, setValue] = useState(message);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (nextEnabled: boolean, nextMessage: string) => {
    setSaving(true);
    try {
      await update({ agentId, nodeId, enabled: nextEnabled, mode: nextEnabled ? "manual" : "ai", message: nextMessage });
    } catch (cause) {
      setCustomEnabled(savedCustomEnabled);
      setValue(message);
      toast.error(cause instanceof Error ? cause.message : "Could not update the escalation message");
    } finally {
      setSaving(false);
    }
  }, [agentId, nodeId, update, savedCustomEnabled, message]);

  useEffect(() => {
    if (!customEnabled || !value.trim() || value === message) return;
    const timeout = window.setTimeout(() => { void save(true, value); }, 500);
    return () => window.clearTimeout(timeout);
  }, [customEnabled, value, message, save]);

  return (
    <div className={cn("nodrag nopan w-full", presentation === "node" && "mt-3 border-t border-border pt-3")} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <FieldLabel htmlFor={`workflow-node-escalation-message-${nodeId}`} className={presentation === "node" ? "text-xs font-medium text-muted-foreground" : undefined}><MessageSquare aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />Custom escalation message</FieldLabel>
          <p className="m-0 text-xs leading-5 text-muted-foreground">Turn on to send your exact message. Otherwise, AI writes the handoff reply in the customer’s language.</p>
        </div>
        <Switch id={`workflow-node-escalation-message-${nodeId}`} aria-label="Custom escalation message" checked={customEnabled} disabled={disabled || saving} onCheckedChange={(nextEnabled) => {
          setCustomEnabled(nextEnabled);
          if (!nextEnabled || value.trim()) void save(nextEnabled, value);
        }} />
      </div>
      {customEnabled ? <Textarea aria-label="Custom escalation message" value={value} disabled={disabled || saving} onChange={(event) => setValue(event.target.value)} placeholder="Write the message to send before handing over to your team" className="mt-3 min-h-20 resize-none text-xs leading-relaxed" /> : null}
    </div>
  );
}
