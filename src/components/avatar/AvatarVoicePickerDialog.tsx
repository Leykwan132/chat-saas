import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { LoaderCircle, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { VoiceOption } from './avatarTypes';
import { avatarSetupFieldClassName } from './avatarSetupStyles';
import { VoicePreviewController, type VoicePreviewSnapshot } from './voicePreviewController';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '../ui/empty';
import { cn } from '../../lib/utils';

type AvatarVoicePickerDialogProps = {
  agentId: Id<'agents'>;
  languageCode: string;
  voices: VoiceOption[];
  selectedVoiceId: string;
  onSelect: (voiceId: string) => void;
};

export function AvatarVoicePickerDialog({
  agentId,
  languageCode,
  voices,
  selectedVoiceId,
  onSelect,
}: AvatarVoicePickerDialogProps) {
  const previewVoice = useAction(api.avatarEmbed.previewVoice);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<VoicePreviewSnapshot>({ status: 'idle' });
  const [controller] = useState(() => new VoicePreviewController(
    (audioBase64) => new Audio(`data:audio/mpeg;base64,${audioBase64}`),
    setPreview,
  ));
  const compatibleVoices = voices.filter((voice) => voice.language === languageCode);
  const selectedVoice = voices.find((voice) => voice.id === selectedVoiceId);

  useEffect(() => () => controller.stop(), [controller]);
  useEffect(() => controller.stop(), [controller, languageCode]);

  const loadPreview = async (voiceId: string) => {
    const result = await previewVoice({ agentId, voiceId });
    return result.audioBase64;
  };

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) controller.stop();
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className={cn(avatarSetupFieldClassName, 'justify-start')} disabled={!languageCode}>
          {selectedVoice?.name ?? 'Select a voice'}
        </Button>
      </DialogTrigger>
      <DialogContent className="min-[480px]:max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a voice</DialogTitle>
          <DialogDescription>Preview a voice, then select the one your avatar will use.</DialogDescription>
        </DialogHeader>
        {compatibleVoices.length === 0 ? (
          <Empty className="min-h-48">
            <EmptyHeader>
              <EmptyTitle>No voices available</EmptyTitle>
              <EmptyDescription>There are no public voices for this language yet.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-1 gap-1 overflow-y-auto min-[480px]:grid-cols-2">
            {compatibleVoices.map((voice) => {
              const isLoading = preview.voiceId === voice.id && preview.status === 'loading';
              const isPlaying = preview.voiceId === voice.id && preview.status === 'playing';
              return (
                <div key={voice.id} className="group flex min-w-0 items-center rounded-lg hover:bg-muted/50">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 justify-start rounded-r-none px-3 py-3 text-left hover:bg-transparent dark:hover:bg-transparent"
                    onClick={() => {
                      controller.stop();
                      onSelect(voice.id);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{voice.name}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {[voice.gender, voice.description].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant={isPlaying ? 'default' : 'secondary'}
                    size="icon"
                    className="mr-2 shrink-0 rounded-full"
                    aria-label={isPlaying ? `Pause ${voice.name}` : `Preview ${voice.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void controller.toggle(voice.id, () => loadPreview(voice.id)).catch((error: unknown) => {
                        controller.stop();
                        toast.error(error instanceof Error ? error.message : 'Could not play voice preview');
                      });
                    }}
                  >
                    {isLoading ? <LoaderCircle className="animate-spin" /> : isPlaying ? <Pause /> : <Play />}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
