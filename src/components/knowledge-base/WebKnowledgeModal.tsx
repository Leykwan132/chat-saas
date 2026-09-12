import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { formatFileSize, type OpenDeleteDialog } from "./helpers";
import { WebEntryDetails } from "./WebEntryDetails";

type WebEntry = {
  _id: Id<"webEntries">;
  url: string;
  fileSize?: number;
  cfItemId?: string;
};

interface WebKnowledgeModalProps {
  entry: WebEntry;
  canManage: boolean;
  canEdit: boolean;
  onClose: () => void;
  openDeleteDialog: OpenDeleteDialog;
}

export function WebKnowledgeModal({
  entry,
  canManage,
  canEdit,
  onClose,
  openDeleteDialog,
}: WebKnowledgeModalProps) {
  const updateWebMarkdown = useAction(api.webResearch.update.updateWebMarkdown);
  const webEntryMarkdown = useQuery(api.knowledgeBase.getWebEntryMarkdown, {
    entryId: entry._id,
  });
  const [isSaving, setIsSaving] = useState(false);

  return (
    <WebEntryDetails
      open={true}
      onOpenChange={(open) => { if (!open) onClose(); }}
      url={entry.url}
      fileSizeLabel={formatFileSize(entry.fileSize ?? 0)}
      markdownUrl={webEntryMarkdown?.markdownUrl}
      isMarkdownLoading={webEntryMarkdown === undefined}
      canManage={canManage}
      canEdit={canEdit}
      isSaving={isSaving}
      onSave={async (markdown) => {
        setIsSaving(true);
        try {
          await updateWebMarkdown({ entryId: entry._id, markdown });
          toast.success("Website knowledge is updating");
          onClose();
        } catch {
          toast.error("Failed to update website knowledge");
        } finally {
          setIsSaving(false);
        }
      }}
      onDelete={() => {
        onClose();
        openDeleteDialog("web", entry._id, entry.cfItemId);
      }}
    />
  );
}
