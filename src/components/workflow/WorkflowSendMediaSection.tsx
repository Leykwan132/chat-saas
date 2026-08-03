import { useEffect, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ArchiveRestore, FileText, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { WorkflowMediaGrid } from './WorkflowMediaGrid';
import { WorkflowMediaUploader } from './WorkflowMediaUploader';
import { getWorkflowSendMediaCopy } from './workflowSendMediaCopy';
import { WorkflowSendMediaTitle } from './WorkflowSendMediaTitle';
import {
  shouldDisplayWorkflowMediaEntry,
  type WorkflowMediaEntry,
} from './workflowMediaTypes';

type WorkflowSendMediaSectionProps = {
  agentId: Id<'agents'>;
  nodeId: Id<'workflowNodes'>;
  nodeKind: 'sendImage' | 'sendFile';
  onReadinessChange: (ready: boolean | undefined) => void;
  showRequirementWarning: boolean;
};

export function WorkflowSendMediaSection({
  agentId,
  nodeId,
  nodeKind,
  onReadinessChange,
  showRequirementWarning,
}: WorkflowSendMediaSectionProps) {
  const entries = useQuery(api.workflowMedia.listForNode, { agentId, nodeId });
  const legacyEntries = useQuery(api.workflowMedia.listLegacyUnassigned, { agentId, nodeId });
  const storageLimits = useQuery(api.knowledgeBase.getStorageLimit);
  const enqueueDelete = useAction(api.workflowMedia.enqueueDelete);
  const importLegacyMedia = useMutation(api.workflowMedia.importLegacyMedia);
  const [deletingClientId, setDeletingClientId] = useState<string>();
  const [isImporting, setIsImporting] = useState(false);

  const maxFileSize = storageLimits?.maxFileSize ?? 4 * 1024 * 1024;
  const mediaEntries = ((entries ?? []) as WorkflowMediaEntry[]).filter(
    shouldDisplayWorkflowMediaEntry,
  );
  const importableEntries = ((legacyEntries ?? []) as WorkflowMediaEntry[]).filter(
    shouldDisplayWorkflowMediaEntry,
  );
  const isLoading = entries === undefined || legacyEntries === undefined;
  const isFileNode = nodeKind === 'sendFile';
  const Icon = isFileNode ? FileText : ImagePlus;
  const itemLabel = isFileNode ? 'file' : 'photo/video';
  const itemLabelPlural = isFileNode ? 'files' : 'photos/videos';
  const mediaCopy = getWorkflowSendMediaCopy(nodeKind, mediaEntries.length, isLoading);
  const readiness = isLoading ? undefined : mediaEntries.length > 0;

  useEffect(() => {
    onReadinessChange(readiness);
  }, [onReadinessChange, readiness]);

  const handleDelete = async (clientId: string) => {
    setDeletingClientId(clientId);
    try {
      await enqueueDelete({ agentId, nodeId, clientId });
      toast.success(`${isFileNode ? 'File' : 'Media'} is being deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete media');
    } finally {
      setDeletingClientId(undefined);
    }
  };

  const handleImportAll = async () => {
    if (importableEntries.length === 0) return;
    setIsImporting(true);
    try {
      const result = await importLegacyMedia({
        agentId,
        nodeId,
        clientIds: importableEntries.map((entry) => entry.clientId),
      });
      toast.success(`${result.imported} ${result.imported === 1 ? itemLabel : itemLabelPlural} imported`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not import media');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <WorkflowSendMediaTitle nodeKind={nodeKind} title={mediaCopy.title} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {importableEntries.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={isImporting}
              onClick={() => void handleImportAll()}
            >
              {isImporting ? (
                <Spinner className="size-3" />
              ) : (
                <ArchiveRestore data-icon="inline-start" />
              )}
              Import
            </Button>
          ) : null}
          {isLoading ? (
            <Button type="button" variant="ghost" size="icon-sm" disabled>
              <Spinner className="size-4" />
              <span className="sr-only">Loading media</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <WorkflowMediaGrid
          entries={mediaEntries}
          onDelete={(clientId) => void handleDelete(clientId)}
          deletingClientId={deletingClientId}
          density="compact"
          className="flex flex-nowrap gap-3"
        >
          <WorkflowMediaUploader
            agentId={agentId}
            nodeId={nodeId}
            maxFileSize={maxFileSize}
            nodeKind={nodeKind}
            layout="tile"
            density="compact"
            onError={toast.error}
          />
        </WorkflowMediaGrid>
      </div>
      <p className="text-xs text-muted-foreground">{mediaCopy.status}</p>
      {showRequirementWarning ? (
        <p className="text-xs text-destructive" role="alert">
          {nodeKind === 'sendFile'
            ? 'Please add at least one file before applying.'
            : 'Please add at least one photo or video before applying.'}
        </p>
      ) : null}
    </div>
  );
}
