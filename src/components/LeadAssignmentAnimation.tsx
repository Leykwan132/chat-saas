import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LeadAssignmentAnimationProps {
  method: 'balanced' | 'round_robin' | 'manual';
}

export default function LeadAssignmentAnimation({ method }: LeadAssignmentAnimationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    setIsVideoLoaded(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [method]);

  const videoSrc = method === 'balanced'
    ? 'https://storage.kilobot.app/kilobot-balanced-2.mp4'
    : method === 'round_robin'
      ? 'https://storage.kilobot.app/kilobot-rr-2.mp4'
      : 'https://storage.kilobot.app/kilobot-manual.mp4';

  return (
    <div className="flex flex-col gap-2.5 w-full select-none">
      <div className="relative w-full overflow-hidden rounded-lg border border-border/80 bg-white dark:bg-zinc-950 p-1.5">
        {!isVideoLoaded && (
          <Skeleton className="w-full aspect-[4/3] rounded-md" />
        )}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
          className={`w-full h-auto rounded-md transition-opacity duration-300 ${
            isVideoLoaded
              ? 'opacity-100 block'
              : 'opacity-0 absolute top-1.5 left-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] pointer-events-none'
          }`}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="px-1 flex flex-col gap-0.5">
        {method === 'balanced' ? (
          <>
            <span className="font-semibold text-foreground text-base">Workload balancing</span>
            <span className="text-xs text-muted-foreground leading-relaxed">
              Keeps workloads fair by sending new tasks to whoever is least busy.
            </span>
          </>
        ) : method === 'round_robin' ? (
          <>
            <span className="font-semibold text-foreground text-base">Taking turns</span>
            <span className="text-xs text-muted-foreground leading-relaxed">
              Takes turns in order, regardless of how busy everyone is.
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold text-foreground text-base">Manual distribution</span>
            <span className="text-xs text-muted-foreground leading-relaxed">
              New tasks stay unassigned so admins can hand-assign them.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
