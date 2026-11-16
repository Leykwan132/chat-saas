import { Tags } from "lucide-react";
import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { normalizeEscalationKeywords } from "../../../shared/escalationKeywords";
import { Switch } from "@/components/ui/switch";
import { KeywordTriggersInput } from "@/components/agent-setup/KeywordTriggersInput";
import { FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Props = {
  agentId: Id<"agents">;
  nodeId: Id<"workflowNodes">;
  enabled?: boolean;
  keywords?: string[];
  disabled: boolean;
  presentation?: "node" | "inspector";
};

export function WorkflowNodeEscalationKeywordsControl({ agentId, nodeId, enabled = false, keywords, disabled, presentation = "node" }: Props) {
  const update = useMutation(api.workflowEscalationKeywords.update);
  const isEnabled = enabled;
  const values = keywords ?? [];
  const [isSaving, setIsSaving] = useState(false);

  const save = async (nextEnabled: boolean, nextValues: string[]) => {
    setIsSaving(true);
    try {
      const normalized = normalizeEscalationKeywords(nextValues);
      await update({ agentId, nodeId, enabled: nextEnabled, keywords: normalized });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save keywords");
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  const isDisabled = disabled || isSaving;
  const KeywordLabel = presentation === "inspector" ? FieldLabel : "label";

  return (
    <div className={cn("nodrag nopan w-full", presentation === "node" && "mt-3")} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <KeywordLabel htmlFor={`escalation-keywords-${nodeId}`} className={presentation === "node" ? "flex items-center gap-2 text-xs font-medium text-muted-foreground" : undefined}><Tags aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />Escalation Keyword Triggers</KeywordLabel>
          <p className="m-0 text-xs leading-5 text-muted-foreground">Escalate immediately when a customer message contains any keyword. Letter case doesn’t matter.</p>
        </div>
        <Switch id={`escalation-keywords-${nodeId}`} aria-label="Escalation Keyword Triggers" checked={isEnabled} disabled={isDisabled} onCheckedChange={(nextEnabled) => { void save(nextEnabled, values); }} />
      </div>
      {isEnabled ? (
        <div className="mt-3">
          <KeywordTriggersInput label="Escalation keyword" placeholder="e.g. human" values={values} disabled={isDisabled} onValuesChange={(nextValues) => save(true, nextValues)} />
        </div>
      ) : null}
    </div>
  );
}
