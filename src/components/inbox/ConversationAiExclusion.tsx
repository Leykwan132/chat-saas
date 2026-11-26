import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Switch } from "@/components/ui/switch";

export function ConversationAiExclusion({
  conversationId,
  excluded,
  canEdit,
}: {
  conversationId: Id<"conversations">;
  excluded: boolean;
  canEdit: boolean;
}) {
  const setExcluded = useMutation(api.conversationAiExclusion.setExcluded);
  const [saving, setSaving] = useState(false);
  async function update(checked: boolean) {
    setSaving(true);
    try {
      await setExcluded({ conversationId, excluded: checked });
      toast.success(
        checked
          ? "Chat excluded from AI replies"
          : "Chat can receive AI replies again",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update AI exclusion",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <label className="flex min-h-12 items-center justify-between gap-4 py-2 text-sm">
      <span className="min-w-0">
        <span className="block font-medium">Exclude from AI replies</span>
        <span className="block text-xs text-muted-foreground">
          Keep this chat human-only.
        </span>
      </span>
      <Switch
        aria-label="Exclude from AI replies"
        checked={excluded}
        disabled={!canEdit || saving}
        onCheckedChange={(checked) => void update(checked)}
      />
    </label>
  );
}
