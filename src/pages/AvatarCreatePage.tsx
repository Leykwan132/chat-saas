import { useEffect, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ArrowLeft, ScanFace } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AvatarLanguageFlag } from '@/components/avatar/AvatarLanguageFlag';
import { AvatarPreviewMedia } from '@/components/avatar/AvatarPreviewMedia';
import { avatarSetupFieldClassName } from '@/components/avatar/avatarSetupStyles';
import { loadAvatarOrientations, type OrientedAvatarOption } from '@/components/avatar/avatarOrientation';
import type { AvatarOption, LanguageOption, VoiceOption } from '@/components/avatar/avatarTypes';
import { AvatarVoicePickerDialog } from '@/components/avatar/AvatarVoicePickerDialog';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [step, setStep] = useState<1 | 2>(1);
  const [avatars, setAvatars] = useState<OrientedAvatarOption[]>();
  const [voices, setVoices] = useState<VoiceOption[]>();
  const [languages, setLanguages] = useState<LanguageOption[]>();
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [language, setLanguage] = useState('');
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
      setVoices(result.voices);
      setLanguages(result.languages);
      setSelectedAvatarId((current) => orientedAvatars.find((avatar) =>
        avatar.id === current || avatar.name === configuration.avatarName,
      )?.id ?? '');
      const configuredLanguage = result.languages.find(
        (option) => option.code === configuration.language,
      )?.code ?? '';
      setLanguage(configuredLanguage);
      setSelectedVoiceId((current) => {
        const candidate = result.voices.find((voice) =>
          voice.id === current || voice.name === configuration.voiceName,
        );
        return candidate?.language === configuredLanguage ? candidate.id : '';
      });
    }).catch((error: unknown) => {
      if (active) setCatalogError(error instanceof Error ? error.message : 'Could not load Avatar choices');
    });
    return () => { active = false; };
  }, [canManage, configuration, listOptions, typedAgentId]);

  const create = async () => {
    if (!selectedAvatarId || !selectedVoiceId || !language) return;
    setCreating(true);
    try {
      await configureAvatar({ agentId: typedAgentId, avatarId: selectedAvatarId, voiceId: selectedVoiceId, language });
      toast.success(configuration?.configured ? 'Avatar updated' : 'Avatar created');
      navigate(`/dashboard/${typedAgentId}/avatar`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create Avatar');
    } finally {
      setCreating(false);
    }
  };

  const selectedAvatar = avatars?.find((avatar) => avatar.id === selectedAvatarId);
  const landscapeAvatars = avatars?.filter((avatar) => avatar.orientation === 'landscape') ?? [];
  const portraitAvatars = avatars?.filter((avatar) => avatar.orientation === 'portrait') ?? [];
  const selectedLanguage = languages?.find((option) => option.code === language);

  const selectAvatar = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
    setStep(2);
  };

  if (permissionsLoading || (canManage && configuration === undefined)) return <AvatarSetupSkeleton />;
  if (!canManage) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">You do not have permission to configure Avatar.</div>;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      {step === 1 ? (
        <Button variant="ghost" size="sm" className="-ml-3 self-start" asChild><Link to={`/dashboard/${typedAgentId}/avatar`}><ArrowLeft data-icon="inline-start" />Back to Avatar</Link></Button>
      ) : (
        <Button variant="ghost" size="sm" className="-ml-3 self-start" onClick={() => setStep(1)}><ArrowLeft data-icon="inline-start" />Back to Avatar</Button>
      )}
      {catalogError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{catalogError}</div> : null}
      {step === 1 ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1"><h1 className="text-2xl font-semibold">Choose your avatar</h1><p className="text-sm text-muted-foreground">Select the face visitors will see during a conversation. You can change this later.</p></div>
          {avatars === undefined ? <AvatarGridSkeleton /> : avatars.length === 0 ? <CatalogEmpty kind="avatars" /> : (
            <div className="flex flex-col gap-8">
              {landscapeAvatars.length ? <AvatarOrientationSection title="Landscape" avatars={landscapeAvatars} selectedAvatarId={selectedAvatarId} onSelect={selectAvatar} /> : null}
              {portraitAvatars.length ? <AvatarOrientationSection title="Portrait" avatars={portraitAvatars} selectedAvatarId={selectedAvatarId} onSelect={selectAvatar} /> : null}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {selectedAvatar ? <SelectedAvatarSummary avatar={selectedAvatar} /> : null}
          <div className="flex flex-col gap-1"><h1 className="text-2xl font-semibold">Choose your voice</h1><p className="text-sm text-muted-foreground">Preview how your avatar will sound. You can change this later.</p></div>
          {voices === undefined || languages === undefined ? <VoiceFormSkeleton /> : languages.length === 0 ? <CatalogEmpty kind="languages" /> : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="avatar-language">Language</Label>
                <Select value={language} onValueChange={(value) => {
                  const selectedVoice = voices.find((voice) => voice.id === selectedVoiceId);
                  setLanguage(value);
                  if (selectedVoice?.language !== value) setSelectedVoiceId('');
                }}>
                  <SelectTrigger id="avatar-language" className={avatarSetupFieldClassName}>
                    <SelectValue placeholder="Select a language">
                      {selectedLanguage ? <LanguageLabel option={selectedLanguage} /> : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {languages.map((option) => <SelectItem key={option.code} value={option.code}><LanguageLabel option={option} /></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Voice</Label>
                <AvatarVoicePickerDialog agentId={typedAgentId} languageCode={language} voices={voices} selectedVoiceId={selectedVoiceId} onSelect={setSelectedVoiceId} />
              </div>
            </div>
          )}
          {languages?.length ? (
            <div className="flex justify-end">
              <Button onClick={() => void create()} disabled={creating || !selectedVoiceId || !language}>{creating ? 'Saving…' : configuration?.configured ? 'Save changes' : 'Create avatar'}</Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function LanguageLabel({ option }: { option: LanguageOption }) {
  return <span className="flex items-center gap-2"><AvatarLanguageFlag languageCode={option.code} /><span>{option.name}</span><span className="text-muted-foreground">{option.code.toUpperCase()}</span></span>;
}

function SelectedAvatarSummary({ avatar }: { avatar: AvatarOption }) {
  return <div className="flex items-center gap-3"><AvatarPreviewMedia previewUrl={avatar.previewUrl} className="w-[270px] max-w-full shrink rounded-lg" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Selected avatar</p><p className="truncate text-sm font-medium">{avatar.name}</p></div></div>;
}

function AvatarOrientationSection({ title, avatars, selectedAvatarId, onSelect }: { title: string; avatars: OrientedAvatarOption[]; selectedAvatarId: string; onSelect: (avatarId: string) => void }) {
  return <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">{title}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{avatars.map((avatar) => <AvatarChoice key={avatar.id} avatar={avatar} selected={selectedAvatarId === avatar.id} onSelect={() => onSelect(avatar.id)} />)}</div></section>;
}

function AvatarChoice({ avatar, selected, onSelect }: { avatar: OrientedAvatarOption; selected: boolean; onSelect: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={cn('overflow-hidden rounded-lg border text-left transition hover:border-foreground/30', selected && 'border-primary ring-2 ring-primary/20')}><AvatarPreviewMedia previewUrl={avatar.previewUrl} /><div className="p-3 text-sm font-medium"><span className="truncate">{avatar.name}</span></div></button>;
}

function CatalogEmpty({ kind }: { kind: 'avatars' | 'languages' }) {
  const isAvatar = kind === 'avatars';
  return <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><ScanFace /></EmptyMedia><EmptyTitle>No {kind} available</EmptyTitle><EmptyDescription>{isAvatar ? 'There are no public avatars available to choose from yet.' : 'There are no supported languages available yet.'}</EmptyDescription></EmptyHeader></Empty>;
}

function AvatarGridSkeleton() {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="overflow-hidden rounded-lg border"><Skeleton className="aspect-video w-full rounded-none" /><div className="p-3"><Skeleton className="h-4 w-2/3 rounded-md" /></div></div>)}</div>;
}

function VoiceFormSkeleton() {
  return <div className="flex flex-col gap-6"><div className="grid gap-4 sm:grid-cols-2"><div className="flex flex-col gap-2"><Skeleton className="h-4 w-20 rounded-md" /><Skeleton className="h-10 w-full rounded-md" /></div><div className="flex flex-col gap-2"><Skeleton className="h-4 w-14 rounded-md" /><Skeleton className="h-10 w-full rounded-md" /></div></div><div className="flex justify-end"><Skeleton className="h-10 w-40 rounded-md" /></div></div>;
}

function AvatarSetupSkeleton() {
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6"><Skeleton className="h-8 w-20 rounded-md" /><div className="flex flex-col gap-2"><Skeleton className="h-8 w-56 rounded-md" /><Skeleton className="h-5 w-full max-w-md rounded-md" /></div><AvatarGridSkeleton /></div>;
}
