import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { normalizeEscalationKeywords } from "../../../shared/escalationKeywords";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";

type Props = {
  id?: string;
  label: string;
  placeholder: string;
  values: string[];
  disabled: boolean;
  onValuesChange: (values: string[]) => void | Promise<boolean | void>;
};

export function KeywordTriggersInput({ id, label, placeholder, values, disabled, onValuesChange }: Props) {
  const [input, setInput] = useState("");
  const addKeyword = async () => {
    if (!input.trim() || disabled || values.length >= 50) return;
    try {
      const nextValues = normalizeEscalationKeywords([...values, input]);
      const saved = await onValuesChange(nextValues);
      if (saved !== false) setInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add keyword");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="w-fit max-w-full shrink-0 border-border bg-background">
        <InputGroupInput className="field-sizing-content w-auto min-w-0 flex-initial" id={id} aria-label={label} placeholder={placeholder} value={input} maxLength={100} disabled={disabled || values.length >= 50} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (input.trim() && !disabled) void addKeyword();
          }
        }} />
        <InputGroupAddon align="inline-end" className="py-0 pr-1.5 has-[>button]:mr-0">
          <InputGroupButton size="icon-xs" className="bg-foreground/5 text-muted-foreground hover:bg-foreground/15 hover:text-foreground dark:hover:bg-foreground/15" aria-label="Add keyword" disabled={disabled || !input.trim() || values.length >= 50} onClick={() => { void addKeyword(); }}><Plus /></InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {values.map((keyword) => (
        <Badge key={keyword} variant="outline" className="h-9 max-w-full gap-1 border-transparent bg-input/50 pl-3 pr-1.5 text-sm">
          <span className="max-w-48 truncate">{keyword}</span>
          <button type="button" data-icon="inline-end" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground/70 transition-colors hover:bg-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" aria-label={`Remove keyword ${keyword}`} disabled={disabled} onClick={() => { void onValuesChange(values.filter((value) => value !== keyword)); }}><X className="size-3" /></button>
        </Badge>
      ))}
    </div>
  );
}
