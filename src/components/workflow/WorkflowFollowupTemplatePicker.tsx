import { Check, Plus, Search, X } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  getWorkflowWhatsappTemplateDetail,
  type WorkflowWhatsappTemplate,
} from './workflowWhatsappTemplates';

type WorkflowFollowupTemplatePickerProps = {
  templates: WorkflowWhatsappTemplate[];
  templatesLoading: boolean;
  selectedTemplateKey: string;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelect: (template: WorkflowWhatsappTemplate) => void;
  createTemplateHref?: string;
};

function templateMatchesSearch(
  template: WorkflowWhatsappTemplate,
  searchQuery: string,
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return `${template.name} ${template.language} ${template.category}`
    .toLowerCase()
    .includes(normalizedQuery);
}

export function WorkflowFollowupTemplatePicker({
  templates,
  templatesLoading,
  selectedTemplateKey,
  searchQuery,
  onSearchQueryChange,
  onSelect,
  createTemplateHref,
}: WorkflowFollowupTemplatePickerProps) {
  const filteredTemplates = templates.filter((template) => (
    templateMatchesSearch(template, searchQuery)
  ));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h3 className="m-0 text-xs font-semibold text-muted-foreground">Template</h3>
        {createTemplateHref ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            asChild
            className="h-8 gap-1.5 px-2.5 text-xs"
          >
            <Link to={createTemplateHref} target="_blank" rel="noopener noreferrer">
              <Plus data-icon="inline-start" />
              Create Template
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="h-10 border border-border bg-background pl-9 text-xs"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
            <span className="sr-only">Clear template search</span>
          </button>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1 pr-2">
        <div className="flex flex-col gap-2">
          {templatesLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No templates found.
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const selected = selectedTemplateKey === template.key;

              return (
                <button
                  key={template.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(template)}
                  className={cn(
                    'relative flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
                    selected
                      ? 'border-foreground bg-zinc-50 dark:bg-zinc-900/30'
                      : 'border-border bg-background hover:border-neutral-300 dark:hover:border-neutral-700',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {template.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {getWorkflowWhatsappTemplateDetail(template)}
                    </span>
                  </span>
                  {selected ? (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
