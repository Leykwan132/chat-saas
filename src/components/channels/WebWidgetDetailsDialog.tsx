import { useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { WebWidgetSettingsPanel } from '@/components/channels/WebWidgetSettingsPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type WebWidgetDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string | undefined;
};

export function WebWidgetDetailsDialog({
  open,
  onOpenChange,
  agentId,
}: WebWidgetDetailsDialogProps) {
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const settings = useQuery(
    api.webWidget.getForAgent,
    open && typedAgentId ? { agentId: typedAgentId } : 'skip',
  );
  const ensureWidget = useMutation(api.webWidget.ensureForAgent);
  const updateSettings = useMutation(api.webWidget.updateSettings);
  const generateIconUploadUrl = useMutation(api.webWidget.generateIconUploadUrl);
  const saveIcon = useMutation(api.webWidget.saveIcon);
  const ensuringAgentRef = useRef<Id<'agents'> | null>(null);

  useEffect(() => {
    if (
      !open ||
      !typedAgentId ||
      settings !== null ||
      ensuringAgentRef.current === typedAgentId
    ) {
      return;
    }
    ensuringAgentRef.current = typedAgentId;
    void ensureWidget({ agentId: typedAgentId })
      .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
      .finally(() => {
        ensuringAgentRef.current = null;
      });
  }, [open, typedAgentId, settings, ensureWidget]);

  const loading = settings === undefined || settings === null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-4 !left-4 grid !h-[calc(100dvh-2rem)] !w-[calc(100vw-2rem)] !max-w-none !translate-x-0 !translate-y-0 grid-rows-[auto_1fr] !gap-0 overflow-hidden !rounded-[2rem] !p-0 shadow-lg sm:!max-w-none lg:!top-6 lg:!left-6 lg:!h-[calc(100dvh-3rem)] lg:!w-[calc(100vw-3rem)]">
        <DialogHeader className="border-b border-border px-8 py-6 lg:px-10 lg:py-7">
          <DialogTitle>Web widget setup</DialogTitle>
          <DialogDescription>
            Configure the website chat widget and copy the installation.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : settings ? (
          <WebWidgetSettingsPanel
            key={settings.publicKey}
            agentId={typedAgentId}
            settings={settings}
            updateSettings={updateSettings}
            generateIconUploadUrl={generateIconUploadUrl}
            saveIcon={saveIcon}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
