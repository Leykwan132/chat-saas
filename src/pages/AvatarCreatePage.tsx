import { useEffect, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ArrowLeft, ScanFace } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AvatarPreviewMedia } from '@/components/avatar/AvatarPreviewMedia';
import { filterBackgroundFreeAvatars, splitAvatarOptions } from '@/components/avatar/avatarCatalog';
import { loadAvatarOrientations, type OrientedAvatarOption } from '@/components/avatar/avatarOrientation';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { Permission } from '../../shared/permissions';

export default function AvatarCreatePage() {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'>;
  const navigate = useNavigate();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canManage = !permissionsLoading && can(Permission.CHANNELS_MANAGE);
  const configuration = useQuery(api.avatar.getForAgent, canManage ? { agentId: typedAgentId } : 'skip');
  const ensureConfiguration = useMutation(api.avatar.ensureForAgent);
  const listOptions = useAction(api.avatarEmbed.listOptions);
  const configureAvatar = useAction(api.avatarEmbed.configure);
  const [avatars, setAvatars] = useState<OrientedAvatarOption[]>();
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [catalogError, setCatalogError] = useState<string>();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (configuration === null && canManage) void ensureConfiguration({ agentId: typedAgentId });
  }, [canManage, configuration, ensureConfiguration, typedAgentId]);

  useEffect(() => {
    if (!canManage || !configuration) return;
    let active = true;
    void listOptions({ agentId: typedAgentId }).then(async (result) => {
      const orientedAvatars = await loadAvatarOrientations(result.avatars);
      if (!active) return;
      setAvatars(orientedAvatars);
      setSelectedAvatarId((current) => orientedAvatars.find((avatar) =>
        avatar.id === current || avatar.name === configuration.avatarName,
      )?.id ?? '');
    }).catch((error: unknown) => {
      if (active) setCatalogError(error instanceof Error ? error.message : 'Could not load Avatar choices');
    });
    return () => { active = false; };
  }, [canManage, configuration, listOptions, typedAgentId]);

  const create = async () => {
    if (!selectedAvatarId) return;
    setCreating(true);
    try {
      await configureAvatar({ agentId: typedAgentId, avatarId: selectedAvatarId });
      toast.success(configuration?.configured ? 'Avatar updated' : 'Avatar created');
      navigate(`/dashboard/${typedAgentId}/avatar`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create Avatar');
    } finally {
      setCreating(false);
    }
  };

  if (permissionsLoading || (canManage && configuration === undefined)) return <AvatarSetupSkeleton />;
  if (!canManage) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">You do not have permission to configure Avatar.</div>;

  const backgroundFreeAvatars = avatars ? filterBackgroundFreeAvatars(avatars) : [];
  const { defaultAvatars, landscapeAvatars, portraitAvatars } = splitAvatarOptions(avatars ?? []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <Button variant="ghost" size="sm" className="-ml-3 self-start" asChild><Link to={`/dashboard/${typedAgentId}/avatar`}><ArrowLeft data-icon="inline-start" />Back to Avatar</Link></Button>
      {catalogError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{catalogError}</div> : null}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1"><h1 className="text-2xl font-semibold">Choose your avatar</h1><p className="text-sm text-muted-foreground">Select the face visitors will see during a conversation. You can change this later.</p></div>
        {avatars === undefined ? <AvatarGridSkeleton /> : backgroundFreeAvatars.length === 0 ? <CatalogEmpty /> : (
          <div className="flex flex-col gap-8">
            {defaultAvatars.length ? <AvatarSection title="Default" avatars={defaultAvatars} selectedAvatarId={selectedAvatarId} onSelect={setSelectedAvatarId} /> : null}
            {landscapeAvatars.length ? <AvatarSection title="Landscape" avatars={landscapeAvatars} selectedAvatarId={selectedAvatarId} onSelect={setSelectedAvatarId} /> : null}
            {portraitAvatars.length ? <AvatarSection title="Portrait" avatars={portraitAvatars} selectedAvatarId={selectedAvatarId} onSelect={setSelectedAvatarId} /> : null}
          </div>
        )}
        {backgroundFreeAvatars.length ? <div className="flex justify-end"><Button onClick={() => void create()} disabled={creating || !selectedAvatarId}>{creating ? 'Saving…' : configuration?.configured ? 'Save changes' : 'Create avatar'}</Button></div> : null}
      </div>
    </div>
  );
}

function AvatarSection({ title, avatars, selectedAvatarId, onSelect }: { title: string; avatars: OrientedAvatarOption[]; selectedAvatarId: string; onSelect: (avatarId: string) => void }) {
  return <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">{title}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{avatars.map((avatar) => <AvatarChoice key={avatar.id} avatar={avatar} selected={selectedAvatarId === avatar.id} onSelect={() => onSelect(avatar.id)} />)}</div></section>;
}

function AvatarChoice({ avatar, selected, onSelect }: { avatar: OrientedAvatarOption; selected: boolean; onSelect: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={cn('overflow-hidden rounded-lg border text-left transition hover:border-foreground/30', selected && 'border-primary ring-2 ring-primary/20')}><AvatarPreviewMedia previewUrl={avatar.previewUrl} /><div className="p-3 text-sm font-medium"><span className="truncate">{avatar.name}</span></div></button>;
}

function CatalogEmpty() {
  return <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><ScanFace /></EmptyMedia><EmptyTitle>No avatars available</EmptyTitle><EmptyDescription>There are no public avatars available to choose from yet.</EmptyDescription></EmptyHeader></Empty>;
}

function AvatarGridSkeleton() {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="overflow-hidden rounded-lg border"><Skeleton className="aspect-video w-full rounded-none" /><div className="p-3"><Skeleton className="h-4 w-2/3 rounded-md" /></div></div>)}</div>;
}

function AvatarSetupSkeleton() {
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6"><Skeleton className="h-8 w-20 rounded-md" /><div className="flex flex-col gap-2"><Skeleton className="h-8 w-56 rounded-md" /><Skeleton className="h-5 w-full max-w-md rounded-md" /></div><AvatarGridSkeleton /></div>;
}
