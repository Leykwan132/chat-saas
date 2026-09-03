import type { MouseEventHandler, ReactNode } from 'react';
import { PhoneOff } from 'lucide-react';
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
    avatarSpeaking,
    subtitle,
    error,
    videoRef,
    start,
    stop,
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
      {active && avatarSpeaking ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs backdrop-blur"
        >
          KiloBot is speaking
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
          className="pointer-events-none absolute inset-x-8 bottom-8 text-center font-sans text-lg font-extrabold leading-normal text-white [-webkit-text-stroke:0.75px_var(--color-neutral-800)] [text-shadow:0_1px_2px_var(--color-neutral-900)] sm:bottom-10"
        >
          {subtitle}
        </p>
      ) : null}
      {active ? (
        <div className="absolute right-6 top-1/2 -translate-y-1/2">
          <StageControl
            label="End chat"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={phase === 'stopping'}
            onClick={() => void stop()}
          >
            <PhoneOff />
          </StageControl>
        </div>
      ) : (
        <Button
          variant="secondary"
          className="absolute bottom-6 left-1/2 min-w-28 -translate-x-1/2 shadow-lg"
          disabled={starting}
          onClick={() => void start()}
        >
          {starting ? <Spinner /> : null}
          {starting ? 'Starting…' : 'Start Chat'}
        </Button>
      )}
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
