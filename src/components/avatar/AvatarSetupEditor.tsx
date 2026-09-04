import { useEffect, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ArrowLeft, ScanFace } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { AvatarBackgroundEditor } from '@/components/avatar/AvatarBackgroundEditor';
import { AvatarBackgroundPreview } from '@/components/avatar/AvatarBackgroundPreview';
import { AvatarCoverImageEditor } from '@/components/avatar/AvatarCoverImageEditor';
import { AvatarPreviewMedia } from '@/components/avatar/AvatarPreviewMedia';
import { filterBackgroundFreeAvatars, splitAvatarOptions } from '@/components/avatar/avatarCatalog';
import { loadAvatarOrientations, type OrientedAvatarOption } from '@/components/avatar/avatarOrientation';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { Permission } from '../../../shared/permissions';

type AvatarSetupEditorProps = {
  agentId: Id<'agents'>;
  onSaved?: () => void;
  showBackLink?: boolean;
};

export function AvatarSetupEditor({ agentId, onSaved, showBackLink = false }: AvatarSetupEditorProps) {
  const navigate = useNavigate();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canManage = !permissionsLoading && can(Permission.CHANNELS_MANAGE);
  const configuration = useQuery(api.avatar.getForAgent, canManage ? { agentId } : 'skip');
  const ensureConfiguration = useMutation(api.avatar.ensureForAgent);
  const listOptions = useAction(api.avatarEmbed.listOptions);
  const configureAvatar = useAction(api.avatarEmbed.configure);
  const [avatars, setAvatars] = useState<OrientedAvatarOption[]>();
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [activeTab, setActiveTab] = useState<'avatar' | 'background'>('avatar');
  const [catalogError, setCatalogError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (configuration === null && canManage) void ensureConfiguration({ agentId });
  }, [agentId, canManage, configuration, ensureConfiguration]);

  useEffect(() => {
    if (!canManage || !configuration) return;
    let active = true;
    void listOptions({ agentId }).then(async (result) => {
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
  }, [agentId, canManage, configuration, listOptions]);

  const save = async () => {
    if (!selectedAvatarId) return;
    setSaving(true);
    try {
      await configureAvatar({ agentId, avatarId: selectedAvatarId });
      toast.success(configuration?.configured ? 'Avatar updated' : 'Avatar created');
      if (onSaved) onSaved();
      else navigate(`/dashboard/${agentId}/avatar`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save Avatar');
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading || (canManage && configuration === undefined)) return <AvatarSetupSkeleton showBackLink={showBackLink} />;
  if (!canManage) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">You do not have permission to configure Avatar.</div>;

  const backgroundFreeAvatars = avatars ? filterBackgroundFreeAvatars(avatars) : [];
  const { landscapeAvatars, portraitAvatars } = splitAvatarOptions(avatars ?? []);
  const selectedAvatar = backgroundFreeAvatars.find((avatar) => avatar.id === selectedAvatarId);
  const availableLandscapeAvatars = landscapeAvatars.filter((avatar) => avatar.id !== selectedAvatarId);
  const availablePortraitAvatars = portraitAvatars.filter((avatar) => avatar.id !== selectedAvatarId);

  return (
    <div className={cn('mx-auto flex w-full max-w-5xl flex-col gap-6 p-6', !showBackLink && 'p-0')}>
      {showBackLink ? <Button variant="ghost" size="sm" className="-ml-3 self-start" asChild><Link to={`/dashboard/${agentId}/avatar`}><ArrowLeft data-icon="inline-start" />Back to Avatar</Link></Button> : null}
      {catalogError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{catalogError}</div> : null}
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">Preview</h2>
          {activeTab === 'background' ? (
            <AvatarBackgroundPreview
              previewUrl={selectedAvatar?.previewUrl ?? configuration?.avatarPreviewUrl}
              coverImageUrl={configuration?.coverImageUrl}
              coverImageType={configuration?.coverImageType}
              backgroundUrl={configuration?.backgroundUrl}
              backgroundType={configuration?.backgroundType}
            />
          ) : (
            <AvatarPreviewMedia
              previewUrl={selectedAvatar?.previewUrl ?? configuration?.avatarPreviewUrl}
              className="w-full rounded-2xl [&_img]:object-contain"
            />
          )}
        </section>
        {avatars === undefined ? <AvatarGridSkeleton /> : backgroundFreeAvatars.length === 0 ? <CatalogEmpty /> : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'avatar' | 'background')} className="gap-6">
            <TabsList variant="line" aria-label="Avatar setup sections" className="w-full justify-start">
              <TabsTrigger value="avatar">Avatar</TabsTrigger>
              <TabsTrigger value="background">Cover &amp; background</TabsTrigger>
            </TabsList>
            <TabsContent value="avatar" className="flex flex-col gap-8">
              {selectedAvatar ? <AvatarSection title="Selected" avatars={[selectedAvatar]} selectedAvatarId={selectedAvatarId} onSelect={setSelectedAvatarId} /> : null}
              {availableLandscapeAvatars.length ? <AvatarSection title="Landscape" avatars={availableLandscapeAvatars} selectedAvatarId={selectedAvatarId} onSelect={setSelectedAvatarId} /> : null}
              {availablePortraitAvatars.length ? <AvatarSection title="Portrait" avatars={availablePortraitAvatars} selectedAvatarId={selectedAvatarId} onSelect={setSelectedAvatarId} /> : null}
            </TabsContent>
            <TabsContent value="background">
              <div className="grid gap-6 sm:grid-cols-2">
                <AvatarCoverImageEditor
                  agentId={agentId}
                  coverImageUrl={configuration?.coverImageUrl}
                  coverImageType={configuration?.coverImageType}
                />
                <AvatarBackgroundEditor
                  agentId={agentId}
                  backgroundUrl={configuration?.backgroundUrl}
                  backgroundType={configuration?.backgroundType}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
        {backgroundFreeAvatars.length ? <div className="flex justify-end"><Button onClick={() => void save()} disabled={saving || !selectedAvatarId}>{saving ? 'Saving…' : configuration?.configured ? 'Save changes' : 'Create avatar'}</Button></div> : null}
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

function AvatarSetupSkeleton({ showBackLink }: { showBackLink: boolean }) {
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">{showBackLink ? <Skeleton className="h-8 w-20 rounded-md" /> : null}<div className="flex flex-col gap-2"><Skeleton className="h-8 w-56 rounded-md" /><Skeleton className="h-5 w-full max-w-md rounded-md" /></div><AvatarGridSkeleton /></div>;
}
