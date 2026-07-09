import {
  Columns3,
  LoaderCircle,
  Maximize2,
  RotateCcw,
  Rows3,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Panel, useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  workflowCanvasViewOptions,
  type WorkflowCanvasView,
} from './workflowCanvasViews';
import type { WorkflowLayoutOrientation } from './workflowLayout';

type WorkflowToolbarProps = {
  activeView: WorkflowCanvasView;
  layoutOrientation: WorkflowLayoutOrientation;
  onViewChange: (view: WorkflowCanvasView) => void;
  onCleanup: () => void;
  onArrange: () => void;
  onReset: () => void;
  cleanupDisabled?: boolean;
  arrangeDisabled?: boolean;
  arrangeLoading?: boolean;
  resetDisabled?: boolean;
  showCleanup?: boolean;
};

export function WorkflowToolbar({
  activeView,
  layoutOrientation,
  onViewChange,
  onCleanup,
  onArrange,
  onReset,
  cleanupDisabled = false,
  arrangeDisabled = false,
  arrangeLoading = false,
  resetDisabled = false,
  showCleanup = true,
}: WorkflowToolbarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const ArrangeIcon = arrangeLoading
    ? LoaderCircle
    : layoutOrientation === 'horizontal' ? Columns3 : Rows3;
  const arrangeLabel = arrangeLoading
    ? 'Re-arranging'
    : layoutOrientation === 'horizontal' ? 'Horizontal' : 'Vertical';

  return (
    <>
      <Panel
        position="top-left"
        className="nodrag nopan m-4"
      >
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 backdrop-blur">
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
          <div className="mx-1 h-8 w-px bg-border" />
          {showCleanup ? (
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
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={arrangeDisabled}
            onClick={onArrange}
          >
            <ArrangeIcon
              data-icon="inline-start"
              className={cn(arrangeLoading && 'animate-spin')}
            />
            {arrangeLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={resetDisabled}
            onClick={onReset}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <RotateCcw data-icon="inline-start" />
            Reset
          </Button>
        </div>
      </Panel>
      <Panel
        position="top-left"
        className="m-4"
        style={{ transform: 'translate3d(0, 52px, 0)' }}
      >
        <div className="flex w-48 flex-col gap-2 rounded-lg border border-border bg-background/95 p-2 backdrop-blur">
          <h2 className="px-1 text-sm font-normal tracking-tight text-muted-foreground">
            Workflow
          </h2>
          <nav
            role="tablist"
            aria-label="Workflow sections"
            className="flex flex-col gap-1"
          >
            {workflowCanvasViewOptions.map((option) => {
              const isActive = option.id === activeView;
              return (
                <Button
                  key={option.id}
                  type="button"
                  role="tab"
                  variant="ghost"
                  size="sm"
                  aria-selected={isActive}
                  className={cn(
                    'w-full justify-start gap-3 rounded-md px-3',
                    isActive && 'bg-secondary font-semibold text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground',
                  )}
                  onClick={() => onViewChange(option.id)}
                >
                  <option.Icon data-icon="inline-start" />
                  {option.label}
                </Button>
              );
            })}
          </nav>
        </div>
      </Panel>
    </>
  );
}
