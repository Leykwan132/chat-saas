import { useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { GEMINI_LIVE_VOICES } from '../../../shared/geminiLiveVoices';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AvatarGeminiVoiceSelector({
  agentId,
  geminiVoice: savedVoice,
}: {
  agentId: Id<'agents'>;
  geminiVoice: string;
}) {
  const updateVoice = useMutation(api.avatar.updateGeminiVoice);
  const [draftVoice, setDraftVoice] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const voice = draftVoice ?? savedVoice;
  const canSave = draftVoice !== undefined && voice !== savedVoice && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(undefined);
    try {
      await updateVoice({ agentId, voice });
      setDraftVoice(undefined);
      toast.success('Avatar voice saved');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save Avatar voice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex w-fit max-w-sm flex-col gap-2">
        <Label htmlFor="avatar-gemini-voice" className="text-base">Voice</Label>
        <Select value={voice} onValueChange={setDraftVoice} disabled={saving}>
          <SelectTrigger id="avatar-gemini-voice" className="h-10 w-auto text-base">
            <SelectValue className="text-base" placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent align="start" className="w-[var(--radix-select-trigger-width)]">
            <SelectGroup>
              {GEMINI_LIVE_VOICES.map((option) => (
                <SelectItem key={option} value={option} className="text-base">{option}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end"><Button onClick={() => void save()} disabled={!canSave}>{saving ? 'Saving…' : 'Save voice'}</Button></div>
    </section>
  );
}
