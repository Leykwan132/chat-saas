import { useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Pencil, ScanFace } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AvatarEmbedCard } from '@/components/avatar/AvatarEmbedCard';
import { AvatarLiveLink } from '@/components/avatar/AvatarLiveLink';
import { AvatarContextEditor } from '@/components/avatar/AvatarContextEditor';
import { AvatarGeminiVoiceSelector } from '@/components/avatar/AvatarGeminiVoiceSelector';
import { AvatarVideoStage } from '@/components/avatar/AvatarVideoStage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/usePermissions';
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
        {configuration.configured && canManage ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/dashboard/${typedAgentId}/avatar/create`}>
              <Pencil data-icon="inline-start" />
              Edit avatar
            </Link>
          </Button>
        ) : null}
      </div>
      {configuration.configured ? (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-3">
                <h2 className="text-base font-medium">Preview</h2>
                <AvatarVideoStage
                  publicKey={configuration.publicKey}
                  previewUrl={configuration.avatarPreviewUrl}
                />
              </div>
            </section>
            <section className="flex min-w-0 flex-col gap-4">
              <AvatarEmbedCard publicKey={configuration.publicKey} />
              <AvatarLiveLink publicKey={configuration.publicKey} />
            </section>
          </div>
          {canManage ? (
            <>
              <AvatarContextEditor agentId={typedAgentId} prompt={configuration.providerContextPrompt ?? ''} openingText={configuration.providerContextOpeningText ?? ''} />
              <AvatarGeminiVoiceSelector agentId={typedAgentId} geminiVoice={configuration.geminiVoice} />
            </>
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
