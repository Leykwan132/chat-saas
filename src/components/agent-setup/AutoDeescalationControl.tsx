import { Clock3, Tags } from "lucide-react";
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { normalizeEscalationKeywords } from '../../../shared/escalationKeywords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { KeywordTriggersInput } from './KeywordTriggersInput';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';

type Config = NonNullable<Doc<'agents'>['autoDeescalation']>;

export function AutoDeescalationSettings({ agentId }: { agentId: Id<'agents'> }) {
  const config = useQuery(api.autoDeescalationConfig.get, { agentId });
  if (config === undefined) return <Skeleton className="h-20 w-full" />;
  return <AutoDeescalationControl key={`${agentId}-${config?.revision ?? 'new'}`} agentId={agentId} config={config} />;
}

export function AutoDeescalationControl({ agentId, config }: { agentId: Id<'agents'>; config: Config | null }) {
  const update = useMutation(api.autoDeescalationConfig.update);
  const [enabled, setEnabled] = useState(config?.enabled === true);
  const [minutes, setMinutes] = useState(config ? String(config.inactivityMinutes) : '');
  const [phrases, setPhrases] = useState(config?.keywords.join('\n') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const inactivityMinutes = Number(minutes);
  const validMinutes = minutes.trim() !== '' && Number.isInteger(inactivityMinutes) && inactivityMinutes >= 1 && inactivityMinutes <= 43200;
  const dirty = enabled !== (config?.enabled === true) || minutes !== (config ? String(config.inactivityMinutes) : '') || phrases !== (config?.keywords.join('\n') ?? '');
  const canSave = !saving && validMinutes && dirty;
  const switchId = `auto-deescalation-${agentId}`;

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      const keywords = normalizeEscalationKeywords(phrases.split('\n'));
      await update({ agentId, enabled, inactivityMinutes, keywords });
      toast.success('Auto Resolve saved');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save Auto Resolve';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FieldGroup className="gap-6">
      <Field orientation="horizontal">
        <div className="flex flex-1 flex-col gap-1">
          <FieldLabel htmlFor={switchId}>Auto Resolve</FieldLabel>
          <FieldDescription>Let AI take over after your team.</FieldDescription>
        </div>
        <Switch id={switchId} checked={enabled} disabled={saving} onCheckedChange={(nextEnabled) => {
          setEnabled(nextEnabled);
          if (!nextEnabled && config) {
            setMinutes(String(config.inactivityMinutes));
            setPhrases(config.keywords.join('\n'));
          }
        }} />
      </Field>
      {enabled ? (
        <>
          <Field data-invalid={minutes !== '' && !validMinutes}>
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor={`${switchId}-minutes`}><Clock3 aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />Resume AI after (minutes)</FieldLabel>
              <p className="m-0 text-xs leading-5 text-muted-foreground">The timer restarts each time your team replies.</p>
            </div>
            <Input id={`${switchId}-minutes`} type="number" min={1} max={43200} step={1} value={minutes} placeholder="Enter minutes" disabled={saving} aria-invalid={minutes !== '' && !validMinutes} onChange={(event) => setMinutes(event.target.value)} />
          </Field>
          <Field>
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor={`${switchId}-phrases`}><Tags aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />Auto Resolve Keyword Triggers</FieldLabel>
              <p className="m-0 text-xs leading-5 text-muted-foreground">Resume AI when your team replies with any of these keywords.</p>
            </div>
            <KeywordTriggersInput id={`${switchId}-phrases`} label="Auto Resolve keyword" placeholder="e.g. resolved" values={phrases ? phrases.split('\n') : []} disabled={saving} onValuesChange={(keywords) => setPhrases(keywords.join('\n'))} />
          </Field>
        </>
      ) : null}
      {error ? <p role="alert" className="m-0 text-sm text-destructive">{error}</p> : null}
      {(enabled || config) ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant={canSave ? 'default' : 'outline'} disabled={!canSave} onClick={() => { void save(); }}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      ) : null}
    </FieldGroup>
  );
}
