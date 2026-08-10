import { Input } from '@/components/ui/input';

type TextKnowledgeEditFormProps = {
  content: string;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  title: string;
};

export function TextKnowledgeEditForm({
  content,
  onContentChange,
  onTitleChange,
  title,
}: TextKnowledgeEditFormProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
      <div className="flex shrink-0 flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground">Title</label>
        <Input
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Knowledge title"
          value={title}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <label className="shrink-0 text-xs font-medium text-muted-foreground">
          Content
        </label>
        <textarea
          className="min-h-0 flex-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
          onChange={(event) => onContentChange(event.target.value)}
          placeholder="Enter text knowledge here..."
          value={content}
        />
      </div>
    </div>
  );
}
