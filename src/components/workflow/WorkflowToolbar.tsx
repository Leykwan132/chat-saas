import {
  Columns3,
  LoaderCircle,
  Maximize2,
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
import type { WorkflowTemplate } from './workflowTemplates';
import { WorkflowTemplateHoverCard } from './WorkflowTemplateHoverCard';

type WorkflowToolbarProps = {
  activeView: WorkflowCanvasView;
  layoutOrientation: WorkflowLayoutOrientation;
  onViewChange: (view: WorkflowCanvasView) => void;
  onCleanup: () => void;
  onArrange: () => void;
  onTemplateApply: (template: WorkflowTemplate) => void;
  cleanupDisabled?: boolean;
  arrangeDisabled?: boolean;
  arrangeLoading?: boolean;
  templatesDisabled?: boolean;
  showCleanup?: boolean;
  showTemplates?: boolean;
};

export function WorkflowToolbar({
  activeView,
  layoutOrientation,
  onViewChange,
  onCleanup,
  onArrange,
  onTemplateApply,
  cleanupDisabled = false,
  arrangeDisabled = false,
  arrangeLoading = false,
  templatesDisabled = false,
  showCleanup = true,
  showTemplates = true,
}: WorkflowToolbarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const ArrangeIcon = arrangeLoading
    ? LoaderCircle
    : layoutOrientation === 'horizontal' ? Columns3 : Rows3;
  const arrangeLabel = arrangeLoading
    ? 'Re-arranging'
    : layoutOrientation === 'horizontal' ? 'Horizontal' : 'Vertical';

  return (
    <Panel position="top-left" className="nodrag nopan m-6">
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-title text-3xl font-normal tracking-tight text-foreground">
          Workflow
        </h1>
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
          {showTemplates ? (
            <WorkflowTemplateHoverCard
              disabled={templatesDisabled}
              onPreview={onTemplateApply}
            />
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
        </div>
        <div className="flex w-48 flex-col gap-2 rounded-lg border border-border bg-background/95 p-2 backdrop-blur">
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
      </div>
    </Panel>
  );
}
