import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type WorkflowTemplatePreviewOverlayProps = {
  name: string;
  isReplacing: boolean;
  onReplace: () => void;
  onSkip: () => void;
};

export function WorkflowTemplatePreviewOverlay({
  name,
  isReplacing,
  onReplace,
  onSkip,
}: WorkflowTemplatePreviewOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
      <div className="pointer-events-auto rounded-xl border border-border bg-background p-3 shadow-lg">
        <p className="mb-3 text-center text-sm font-medium">
          Previewing: {name}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button type="button" disabled={isReplacing} onClick={onReplace}>
            {isReplacing ? (
              <Loader2
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            Replace Current
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isReplacing}
            onClick={onSkip}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
