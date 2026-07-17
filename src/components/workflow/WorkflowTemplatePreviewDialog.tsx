import { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { WorkflowBackground } from "./WorkflowBackground";
import {
  workflowCanvasEdgeTypes,
  workflowCanvasNodeTypes,
} from "./workflowCanvasConfig";
import { getWorkflowCanvasViewElements } from "./workflowCanvasViews";
import { workflowGraphToFlow } from "./workflowFlowModel";
import type { WorkflowTemplatePreview } from "./workflowTemplatePreviewModel";

type WorkflowTemplatePreviewDialogProps = {
  preview?: WorkflowTemplatePreview;
  isReplacing: boolean;
  onReplace: () => void;
  onSkip: () => void;
};

function WorkflowTemplatePreviewCanvas({
  preview,
}: {
  preview: WorkflowTemplatePreview;
}) {
  const flow = useMemo(() => {
    const graphFlow = workflowGraphToFlow(
      preview.graph,
      () => undefined,
      () => undefined,
      undefined,
      preview.graph.workflow.layoutOrientation ?? "horizontal",
      true,
    );
    return getWorkflowCanvasViewElements(
      graphFlow.nodes,
      graphFlow.edges,
      "messageHandling",
    );
  }, [preview]);

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={workflowCanvasNodeTypes}
        edgeTypes={workflowCanvasEdgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.35}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        connectOnClick={false}
        panOnDrag
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
      >
        <WorkflowBackground />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

export function WorkflowTemplatePreviewDialog({
  preview,
  isReplacing,
  onReplace,
  onSkip,
}: WorkflowTemplatePreviewDialogProps) {
  if (!preview) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isReplacing) onSkip();
      }}
    >
      <DialogContent
        className="flex h-[80vh] w-[90vw] max-w-[90vw] flex-col gap-0 overflow-hidden p-0"
        showCloseButton={!isReplacing}
        onEscapeKeyDown={(event) => {
          if (isReplacing) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isReplacing) event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 border-b p-6">
          <DialogTitle>Preview {preview.template.name}</DialogTitle>
          <DialogDescription>
            Review this read-only workflow before replacing your current map.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 bg-muted/35">
          <WorkflowTemplatePreviewCanvas preview={preview} />
        </div>
        <DialogFooter className="shrink-0 border-t p-4">
          <Button
            type="button"
            variant="outline"
            disabled={isReplacing}
            onClick={onSkip}
          >
            Skip
          </Button>
          <Button
            type="button"
            disabled={isReplacing}
            onClick={onReplace}
          >
            {isReplacing ? <Spinner data-icon="inline-start" /> : null}
            Replace Current
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
