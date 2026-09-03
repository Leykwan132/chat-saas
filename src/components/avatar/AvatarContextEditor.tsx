import { useState } from 'react';
import { useAction } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ContextDraft = {
  prompt: string;
  openingText: string;
};

export function AvatarContextEditor({
  agentId,
  prompt: savedPrompt,
  openingText: savedOpeningText,
}: {
  agentId: Id<'agents'>;
  prompt: string;
  openingText: string;
}) {
  const saveContext = useAction(api.avatarContext.save);
  const [draft, setDraft] = useState<ContextDraft>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const prompt = draft?.prompt ?? savedPrompt;
  const openingText = draft?.openingText ?? savedOpeningText;
  const updatePrompt = (value: string) => setDraft((current) => ({
    prompt: value,
    openingText: current?.openingText ?? savedOpeningText,
  }));
  const updateOpeningText = (value: string) => setDraft((current) => ({
    prompt: current?.prompt ?? savedPrompt,
    openingText: value,
  }));

  const trimmedPrompt = prompt.trim();
  const trimmedOpeningText = openingText.trim();
  const changed = prompt !== savedPrompt || openingText !== savedOpeningText;
  const canSave = changed && Boolean(trimmedPrompt && trimmedOpeningText) && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(undefined);
    try {
      await saveContext({ agentId, prompt: trimmedPrompt, openingText: trimmedOpeningText });
      setDraft(undefined);
      toast.success('Avatar context saved');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save Avatar context');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div><h2 className="text-sm font-semibold">Context</h2></div>
      <div className="flex flex-col gap-2"><Label htmlFor="avatar-context-prompt">Instructions</Label><Textarea id="avatar-context-prompt" value={prompt} onChange={(event) => updatePrompt(event.target.value)} className="min-h-36" placeholder="Describe the role, tone, knowledge, and boundaries." /></div>
      <div className="flex flex-col gap-2"><Label htmlFor="avatar-context-opening">Opening text</Label><Input id="avatar-context-opening" value={openingText} onChange={(event) => updateOpeningText(event.target.value)} placeholder="Hello, how can I help?" /></div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end"><Button onClick={() => void save()} disabled={!canSave}>{saving ? 'Saving…' : 'Save context'}</Button></div>
    </section>
  );
}
