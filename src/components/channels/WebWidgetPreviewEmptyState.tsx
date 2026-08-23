import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { MessageCircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

type WebWidgetPreviewEmptyStateProps = {
  subduedTextClassName: string;
};

export function WebWidgetPreviewEmptyState({
  subduedTextClassName,
}: WebWidgetPreviewEmptyStateProps) {
  return (
    <Empty className="h-full min-h-0 rounded-none border-0 !p-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageCircleDashed />
        </EmptyMedia>
        <EmptyTitle className="text-[17px]">How can we help?</EmptyTitle>
        <EmptyDescription className={cn("text-sm", subduedTextClassName)}>
          Ask a question to start the conversation.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
