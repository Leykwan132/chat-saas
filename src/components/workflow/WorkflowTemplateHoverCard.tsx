import { useState, type KeyboardEvent } from 'react';
import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from './workflowTemplates';

type WorkflowTemplateHoverCardProps = {
  onReplace: (template: WorkflowTemplate) => void;
};

export function WorkflowTemplateHoverCard({ onReplace }: WorkflowTemplateHoverCardProps) {
  const [open, setOpen] = useState(false);
  const applyTemplate = (template: WorkflowTemplate) => {
    onReplace(template);
    setOpen(false);
  };
  const handleTemplateKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    template: WorkflowTemplate,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    applyTemplate(template);
  };
  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={100} closeDelay={180}>
      <HoverCardTrigger asChild>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <LayoutTemplate data-icon="inline-start" />
          Templates
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-[min(33.6rem,calc(100vw-2rem))] rounded-xl p-3"
      >
        <div className="px-1 pb-3">
          <p className="font-medium">Start with a template</p>
          <p className="text-xs text-muted-foreground">This replaces your current workflow draft.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {WORKFLOW_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              size="sm"
              role="button"
              tabIndex={0}
              aria-label={`Try ${template.name} template`}
              onClick={() => applyTemplate(template)}
              onKeyDown={(event) => handleTemplateKeyDown(event, template)}
              className="h-full cursor-pointer gap-3 rounded-xl shadow-none outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto justify-end">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary [&_svg]:size-4">
                  Try now
                  <ArrowRight data-icon="inline-end" />
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
