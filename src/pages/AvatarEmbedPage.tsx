import { useQuery } from 'convex/react';
import { useParams } from 'react-router';
import { api } from '../../convex/_generated/api';
import { AvatarUnavailableState } from '@/components/avatar/AvatarUnavailableState';
import { AvatarVideoStage } from '@/components/avatar/AvatarVideoStage';
import { Spinner } from '@/components/ui/spinner';

export default function AvatarEmbedPage() {
  const { publicKey = '' } = useParams();
  const config = useQuery(api.avatar.publicGetConfig, { publicKey });

  if (config === undefined) {
    return (
      <div className="flex size-full min-h-80 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (config === null) return <AvatarUnavailableState />;

  return (
    <main className="w-full">
      <AvatarVideoStage
        publicKey={publicKey}
        previewUrl={config.avatarPreviewUrl}
      />
    </main>
  );
}
