import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { isInstalledApp } from "./installedApp";

export function usePwaConversationSelection(initial: string | null) {
  const [selected, setSelected] = useState<Id<"conversations"> | null>(
    initial as Id<"conversations"> | null,
  );
  const [, setSearchParams] = useSearchParams();
  const conversation = useQuery(
    api.conversations.get,
    isInstalledApp() && selected ? { conversationId: selected } : "skip",
  );
  useEffect(() => {
    if (conversation === null) setSelected(null);
  }, [conversation]);
  useEffect(() => {
    if (!isInstalledApp()) return;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (selected) next.set("conversation", selected);
        else next.delete("conversation");
        return next;
      },
      { replace: true },
    );
  }, [selected, setSearchParams]);
  return [selected, setSelected] as const;
}
