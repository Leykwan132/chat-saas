import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  const [prompt, setPrompt] = useState(savedPrompt);
  const [openingText, setOpeningText] = useState(savedOpeningText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setPrompt(savedPrompt);
    setOpeningText(savedOpeningText);
  }, [savedOpeningText, savedPrompt]);

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
      toast.success('Avatar context saved');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save Avatar context');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border p-5">
      <div><h2 className="text-sm font-semibold">Context</h2><p className="mt-1 text-sm text-muted-foreground">Instructions Gemini uses for every Avatar conversation.</p></div>
      <div className="flex flex-col gap-2"><Label htmlFor="avatar-context-prompt">System instructions</Label><Textarea id="avatar-context-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-36" placeholder="Describe the role, tone, knowledge, and boundaries." /></div>
      <div className="flex flex-col gap-2"><Label htmlFor="avatar-context-opening">Opening text</Label><Input id="avatar-context-opening" value={openingText} onChange={(event) => setOpeningText(event.target.value)} placeholder="Hello, how can I help?" /></div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end"><Button onClick={() => void save()} disabled={!canSave}>{saving ? 'Saving…' : 'Save context'}</Button></div>
    </section>
  );
}
