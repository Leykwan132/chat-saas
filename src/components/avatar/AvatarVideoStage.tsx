import { useCallback, useRef, type MouseEventHandler, type ReactNode } from 'react';
import { PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarPreviewMedia } from './AvatarPreviewMedia';
import { useAvatarSession } from './useAvatarSession';
import { useAvatarBackgroundCompositor } from './avatarBackgroundCompositor';
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
  coverImageUrl,
  backgroundUrl,
  backgroundType,
  fullScreen = false,
}: {
  publicKey: string;
  previewUrl?: string;
  coverImageUrl?: string;
  backgroundUrl?: string;
  backgroundType?: 'image' | 'video';
  fullScreen?: boolean;
}) {
  const {
    phase,
    error,
    inactivityCountdown,
    videoRef,
    start,
    stop,
  } = useAvatarSession(publicKey);
  const active = phase === 'active' || phase === 'stopping';
  const starting = phase === 'starting';
  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const attachVideo = useCallback((element: HTMLMediaElement | null) => {
    sourceVideoRef.current = element instanceof HTMLVideoElement ? element : null;
    videoRef(element);
  }, [videoRef]);
  useAvatarBackgroundCompositor(sourceVideoRef, canvasRef, active && Boolean(backgroundUrl));
  const stageClassName = fullScreen
    ? 'relative size-full overflow-hidden bg-zinc-950 text-white'
    : 'relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl bg-zinc-950 text-white';

  return (
    <section className={stageClassName}>
      {backgroundUrl ? (
        backgroundType === 'video' ? (
          <video
            src={backgroundUrl}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 size-full object-cover"
          />
        ) : (
          <img
            src={backgroundUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 size-full object-cover"
          />
        )
      ) : null}
      <video
        ref={attachVideo}
        autoPlay
        playsInline
        className={cn(
          'pointer-events-none absolute inset-0 z-10 size-full object-cover',
          active && backgroundUrl ? 'opacity-0' : null,
        )}
      />
      {active && backgroundUrl ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 size-full object-cover"
        />
      ) : null}
      {!active ? (
        <AvatarPreviewMedia
          previewUrl={coverImageUrl ?? previewUrl}
          className={cn(
            'pointer-events-none absolute inset-0 size-full rounded-none',
            coverImageUrl ? '[&_img]:object-cover' : '[&_img]:object-contain',
          )}
        />
      ) : null}
      {starting ? (
        <div className="absolute inset-0 z-40">
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/45"
          >
            <div className="flex flex-col items-center gap-3 text-white">
              <Spinner className="size-8" />
              <span className="text-sm font-medium">Connecting...</span>
            </div>
          </div>
        </div>
      ) : null}
      {active && inactivityCountdown !== null ? (
        <p
          aria-live="polite"
          className="absolute left-1/2 top-6 z-10 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          Chat closing in {inactivityCountdown}
        </p>
      ) : null}
      {error ? (
        <p className="absolute inset-x-6 bottom-20 text-center text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {active ? (
        <div className="absolute right-6 top-1/2 z-30 -translate-y-1/2">
          <StageControl
            label="End chat"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={phase === 'stopping'}
            onClick={() => void stop()}
          >
            <PhoneOff />
          </StageControl>
        </div>
      ) : starting ? null : (
        <div className="pointer-events-none absolute inset-0 z-30">
          <Button
            variant="secondary"
            className="absolute bottom-6 left-1/2 min-w-28 -translate-x-1/2 shadow-lg border-2 border-emerald-500 pointer-events-auto hover:border-emerald-400"
            disabled={starting}
            onClick={() => void start()}
          >
            Start Chat
          </Button>
        </div>
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
