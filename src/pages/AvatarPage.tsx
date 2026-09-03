import { useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ExternalLink, Pencil, ScanFace } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AvatarContextEditor } from '@/components/avatar/AvatarContextEditor';
import { AvatarBackgroundEditor } from '@/components/avatar/AvatarBackgroundEditor';
import { AvatarCoverImageEditor } from '@/components/avatar/AvatarCoverImageEditor';
import { AvatarGeminiVoiceSelector } from '@/components/avatar/AvatarGeminiVoiceSelector';
import { AvatarShareDialog } from '@/components/avatar/AvatarShareDialog';
import { AvatarVideoStage } from '@/components/avatar/AvatarVideoStage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
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
              <Button variant="outline" size="sm" asChild>
                <Link to={`/dashboard/${typedAgentId}/avatar/create`}>
                  <Pencil data-icon="inline-start" />
                  Edit avatar
                </Link>
              </Button>
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
              mediaSlot={(
                <>
                  <AvatarCoverImageEditor
                    agentId={typedAgentId}
                    coverImageUrl={configuration.coverImageUrl}
                    coverImageType={configuration.coverImageType}
                  />
                  <AvatarBackgroundEditor agentId={typedAgentId} backgroundUrl={configuration.backgroundUrl} backgroundType={configuration.backgroundType} />
                </>
              )}
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
