import type { MouseEventHandler, ReactNode } from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarPreviewMedia } from './AvatarPreviewMedia';
import { useAvatarSession } from './useAvatarSession';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AvatarVideoStage({
  publicKey,
  previewUrl,
}: {
  publicKey: string;
  previewUrl?: string;
}) {
  const {
    phase,
    muted,
    avatarSpeaking,
    subtitle,
    error,
    videoRef,
    start,
    stop,
    mute,
    unmute,
  } = useAvatarSession(publicKey);
  const active = phase === 'active' || phase === 'stopping';
  const starting = phase === 'starting';

  return (
    <section className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl bg-zinc-950 text-white">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 size-full object-cover"
      />
      {!active ? (
        <AvatarPreviewMedia
          previewUrl={previewUrl}
          className="absolute inset-0 size-full rounded-none [&_img]:object-cover"
        />
      ) : null}
      {active ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs backdrop-blur"
        >
          {avatarSpeaking ? 'KiloBot is speaking' : 'Listening'}
        </div>
      ) : null}
      {error ? (
        <p className="absolute inset-x-6 bottom-20 text-center text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {active && subtitle ? (
        <p
          aria-live="polite"
          className="pointer-events-none absolute inset-x-8 bottom-20 text-center text-lg font-semibold leading-relaxed text-white [-webkit-text-stroke:1px_black] [text-shadow:0_2px_2px_black] sm:bottom-24"
        >
          {subtitle}
        </p>
      ) : null}
      <div className="absolute bottom-6 right-6 top-6 flex flex-col items-end sm:bottom-8">
        {active ? (
          <>
            <StageControl
              label={muted ? 'Unmute microphone' : 'Mute microphone'}
              disabled={phase === 'stopping'}
              onClick={() => void (muted ? unmute() : mute())}
            >
              {muted ? <MicOff /> : <Mic />}
            </StageControl>
            <div className="mt-auto">
              <StageControl
                label="End chat"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={phase === 'stopping'}
                onClick={() => void stop()}
              >
                <PhoneOff />
              </StageControl>
            </div>
          </>
        ) : (
          <div className="mt-auto">
            <Button
              variant="secondary"
              className="min-w-28 shadow-lg"
              disabled={starting}
              onClick={() => void start()}
            >
              {starting ? <Spinner /> : null}
              {starting ? 'Starting…' : 'Start Chat'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function StageControl({
  label,
  className,
  disabled,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  disabled: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-lg"
          variant="secondary"
          aria-label={label}
          className={cn('rounded-full shadow-lg', className)}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
