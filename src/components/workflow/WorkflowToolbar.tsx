import { Maximize2, RotateCcw, WandSparkles, ZoomIn, ZoomOut } from 'lucide-react';
import { Panel, useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';

type WorkflowToolbarProps = {
  onCleanup: () => void;
  onReset: () => void;
  cleanupDisabled?: boolean;
  resetDisabled?: boolean;
};

export function WorkflowToolbar({
  onCleanup,
  onReset,
  cleanupDisabled = false,
  resetDisabled = false,
}: WorkflowToolbarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  return (
    <Panel position="top-left" className="m-4">
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-background/95 p-1 shadow-sm backdrop-blur">
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => zoomIn()}>
          <ZoomIn data-icon="inline-start" />
          <span className="sr-only">Zoom in</span>
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => zoomOut()}>
          <ZoomOut data-icon="inline-start" />
          <span className="sr-only">Zoom out</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => fitView({ padding: 0.25, duration: 240 })}
        >
          <Maximize2 data-icon="inline-start" />
          <span className="sr-only">Fit view</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled>
          Templates
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={cleanupDisabled}
          onClick={onCleanup}
        >
          <WandSparkles data-icon="inline-start" />
          Cleanup
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={resetDisabled}
          onClick={onReset}
        >
          <RotateCcw data-icon="inline-start" />
          Reset
        </Button>
      </div>
    </Panel>
  );
}
