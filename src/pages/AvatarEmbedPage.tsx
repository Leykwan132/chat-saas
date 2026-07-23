import { useQuery } from 'convex/react';
import { Mic, ScanFace } from 'lucide-react';
import { useParams } from 'react-router';
import { api } from '../../convex/_generated/api';
import { useAvatarSession } from '@/components/avatar/useAvatarSession';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function AvatarEmbedPage() {
  const { publicKey = '' } = useParams();
  const config = useQuery(api.avatar.publicGetConfig, { publicKey });
  const { phase, error, videoRef, start } = useAvatarSession(publicKey);
  const starting = phase === 'starting';
  const ended = phase === 'ended';

  if (config === undefined) {
    return (
      <div className="flex size-full min-h-80 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (config === null) {
    return (
      <main className="flex min-h-svh w-full items-center justify-center bg-zinc-950 p-6 text-center text-white">
        <div>
          <ScanFace className="mx-auto mb-3 size-10" />
          <h1 className="text-xl font-semibold">Avatar unavailable</h1>
          <p className="mt-2 text-sm text-zinc-300">
            This Avatar embed is disabled or no longer exists.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-zinc-950 text-white">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 size-full object-cover"
      />
      {phase !== 'active' ? (
        <div className="relative z-10 mx-5 flex max-w-sm flex-col items-center rounded-2xl border border-white/10 bg-black/60 p-7 text-center backdrop-blur">
          <ScanFace className="mb-3 size-10" />
          <h1 className="text-xl font-semibold">Talk with KiloBot</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Start a live voice conversation. Your browser will ask for microphone access.
          </p>
          <Button
            className="mt-5"
            onClick={() => void start()}
            disabled={starting || ended}
          >
            {starting ? <Spinner className="mr-2 size-4" /> : <Mic className="mr-2 size-4" />}
            {ended ? 'Conversation ended' : 'Start conversation'}
          </Button>
          {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
        </div>
      ) : null}
    </main>
  );
}
