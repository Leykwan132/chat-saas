import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { normalizeEscalationKeywords } from "../../../shared/escalationKeywords";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  agentId: Id<"agents">;
  nodeId: Id<"workflowNodes">;
  enabled?: boolean;
  keywords?: string[];
  disabled: boolean;
};

export function WorkflowNodeEscalationKeywordsControl({ agentId, nodeId, enabled = false, keywords, disabled }: Props) {
  const update = useMutation(api.workflowEscalationKeywords.update);
  const isEnabled = enabled;
  const values = keywords ?? [];
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const save = async (nextEnabled: boolean, nextValues: string[]) => {
    setIsSaving(true);
    try {
      const normalized = normalizeEscalationKeywords(nextValues);
      await update({ agentId, nodeId, enabled: nextEnabled, keywords: normalized });
      setInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save keywords");
    } finally {
      setIsSaving(false);
    }
  };
  const isDisabled = disabled || isSaving;

  return (
    <div className="nodrag nopan mt-3 w-full border-t border-border pt-3" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`escalation-keywords-${nodeId}`} className="text-xs font-medium text-muted-foreground">Keyword detection</label>
        <Switch id={`escalation-keywords-${nodeId}`} aria-label="Keyword detection" checked={isEnabled} disabled={isDisabled} onCheckedChange={(nextEnabled) => { void save(nextEnabled, values); }} />
      </div>
      {isEnabled ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Escalate immediately when a customer message contains any keyword. Letter case doesn’t matter.</p>
          <div className="flex flex-wrap gap-1.5">
            {values.map((keyword) => (
              <Badge key={keyword} variant="secondary" className="gap-1">
                <span className="max-w-48 truncate">{keyword}</span>
                <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove keyword ${keyword}`} disabled={isDisabled} onClick={() => { void save(true, values.filter((value) => value !== keyword)); }}><X className="size-3" /></Button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input aria-label="Escalation keyword" placeholder="e.g. human or talk to someone" value={input} maxLength={100} disabled={isDisabled || values.length >= 50} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (input.trim() && !isDisabled) void save(true, [...values, input]);
              }
            }} />
            <Button type="button" variant="outline" size="sm" disabled={isDisabled || !input.trim() || values.length >= 50} onClick={() => { void save(true, [...values, input]); }}>Add keyword</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
