import { ScanFace } from 'lucide-react';

export function AvatarUnavailableState() {
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
