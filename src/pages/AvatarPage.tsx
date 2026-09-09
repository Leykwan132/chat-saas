import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ChevronDown, ExternalLink, Pencil, ScanFace } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AvatarContextEditor } from '@/components/avatar/AvatarContextEditor';
import { AvatarGeminiVoiceSelector } from '@/components/avatar/AvatarGeminiVoiceSelector';
import { AvatarSetupEditor } from '@/components/avatar/AvatarSetupEditor';
import { AvatarShareDialog } from '@/components/avatar/AvatarShareDialog';
import { AvatarVideoStage } from '@/components/avatar/AvatarVideoStage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/usePermissions';
import { buildAvatarLiveUrl } from '@/lib/avatarEmbed';
import { Permission } from '../../shared/permissions';

export default function AvatarPage() {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'>;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canRead = !permissionsLoading && can(Permission.CHANNELS_READ);
  const canManage = !permissionsLoading && can(Permission.CHANNELS_MANAGE);
  const configuration = useQuery(api.avatar.getForAgent, canRead ? { agentId: typedAgentId } : 'skip');
  const ensureConfiguration = useMutation(api.avatar.ensureForAgent);
  const removeAvatar = useMutation(api.avatarRemove.remove);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (configuration === null && canManage) void ensureConfiguration({ agentId: typedAgentId });
  }, [canManage, configuration, ensureConfiguration, typedAgentId]);

  if (permissionsLoading || configuration === undefined) return <LoadingState />;
  if (!canRead) return <MessageState text="You do not have permission to view Avatar settings." />;
  if (configuration === null) return canManage ? <LoadingState /> : <MessageState text="Avatar has not been configured for this workspace." />;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><h1 className="font-title text-3xl font-normal">Avatar</h1><Badge variant="secondary" className="bg-muted text-muted-foreground">Beta</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">Give visitors a face and voice for live conversations with KiloBot.</p>
        </div>
        {configuration.configured ? (
          <div className="flex items-center gap-2">
            {canManage ? (
            <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" type="button">
                  <Pencil data-icon="inline-start" />
                  Edit
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit Avatar</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>Delete Avatar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="max-h-[90vh] sm:max-w-5xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Avatar</DialogTitle>
                  <DialogDescription>Update the avatar, background, and media used for live conversations.</DialogDescription>
                </DialogHeader>
                <AvatarSetupEditor agentId={typedAgentId} onSaved={() => setEditOpen(false)} />
              </DialogContent>
            </Dialog>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Avatar?</DialogTitle>
                  <DialogDescription>This removes the avatar from live conversations. You can create a new one later.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" variant="outline" disabled={deleting} onClick={() => setDeleteOpen(false)}>Cancel</Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => {
                      setDeleting(true);
                      void removeAvatar({ agentId: typedAgentId }).then(() => {
                        setDeleteOpen(false);
                        toast.success('Avatar deleted');
                      }).catch((error: unknown) => {
                        toast.error(error instanceof Error ? error.message : 'Could not delete Avatar');
                      }).finally(() => setDeleting(false));
                    }}
                  >
                    {deleting ? 'Deleting…' : 'Delete Avatar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
            ) : null}
            <AvatarShareDialog publicKey={configuration.publicKey} />
          </div>
        ) : null}
      </div>
      {configuration.configured ? (
        <>
          <div className="grid items-start gap-6">
            <section className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1">
                  <h2 className="text-base font-medium">Preview</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Open Avatar preview"
                    title="Open Avatar preview"
                    asChild
                  >
                    <a href={buildAvatarLiveUrl(configuration.publicKey)} target="_blank" rel="noreferrer">
                      <ExternalLink />
                      <span className="sr-only">Open Avatar preview</span>
                    </a>
                  </Button>
                </div>
                <AvatarVideoStage
                  publicKey={configuration.publicKey}
                  previewUrl={configuration.avatarPreviewUrl}
                  coverImageUrl={configuration.coverImageUrl}
                  coverImageType={configuration.coverImageType}
                  backgroundUrl={configuration.backgroundUrl}
                  backgroundType={configuration.backgroundType}
                  sessionMode="preview"
                />
              </div>
            </section>
          </div>
          {canManage ? (
            <AvatarContextEditor
              agentId={typedAgentId}
              prompt={configuration.providerContextPrompt ?? ''}
              openingText={configuration.providerContextOpeningText ?? ''}
              voiceSlot={<AvatarGeminiVoiceSelector agentId={typedAgentId} geminiVoice={configuration.geminiVoice} />}
            />
          ) : null}
        </>
      ) : (
        <Empty className="min-h-[420px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ScanFace /></EmptyMedia>
            <EmptyTitle>No avatar yet</EmptyTitle>
            <EmptyDescription>Choose an avatar and voice to start live conversations. You can edit both later.</EmptyDescription>
          </EmptyHeader>
          {canManage ? <EmptyContent><Button asChild><Link to={`/dashboard/${typedAgentId}/avatar/create`}>Create avatar</Link></Button></EmptyContent> : null}
        </Empty>
      )}
    </div>
  );
}

function LoadingState() {
  return <div className="flex min-h-[50vh] items-center justify-center"><Spinner className="size-6" /></div>;
}

function MessageState({ text }: { text: string }) {
  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">{text}</div>;
}
