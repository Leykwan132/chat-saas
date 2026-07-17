import { useEffect } from "react";

export function useWorkflowTemplatePreviewEscape(
  preview: { onSkip: () => void } | undefined,
) {
  useEffect(() => {
    if (!preview) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") preview.onSkip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [preview]);
}
