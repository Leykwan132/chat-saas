import { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { CheckCircle2, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
].join(',');

const INSTAGRAM_OAUTH_BASE = 'https://www.instagram.com/oauth/authorize';

// The Instagram OAuth redirect lands on /dashboard/:agentId/channels with
// `?code=...`. ChannelsPage detects the code on mount and calls
// `api.instagramConnect.completeSignup`. This button only assembles the
// authorize URL and navigates the browser to it.
export function ConnectInstagramButton() {
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const [busy, setBusy] = useState(false);

  const appId = import.meta.env.VITE_INSTAGRAM_APP_ID as string | undefined;

  const instagramChannel = useMemo(
    () => channels?.find((c) => c.service === 'instagram'),
    [channels],
  );

  const launchSignup = useCallback(() => {
    if (!appId) {
      toast.error(
        'Instagram is not configured. Set VITE_INSTAGRAM_APP_ID on the frontend.',
      );
      return;
    }
    setBusy(true);
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const url = new URL(INSTAGRAM_OAUTH_BASE);
    url.searchParams.set('force_reauth', 'true');
    url.searchParams.set('client_id', appId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', INSTAGRAM_SCOPES);
    window.location.assign(url.toString());
  }, [appId]);

  if (instagramChannel?.status === 'connected') {
    return (
      <Button type="button" variant="outline" disabled>
        <CheckCircle2 className="size-4" />
        Connected
      </Button>
    );
  }

  return (
    <Button type="button" onClick={launchSignup} disabled={busy}>
      {busy ? <Spinner className="size-4" /> : <Plus className="size-4" />}
      Connect
      <ExternalLink className="size-3.5 opacity-70" />
    </Button>
  );
}
