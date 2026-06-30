import { useCallback, useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { useSearchParams } from 'react-router';
import { CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Shimmer } from '@/components/ai-elements/shimmer';

type MessengerPageOption = {
  id: string;
  name?: string;
};

type PagePickerState = {
  sessionId: Id<'oauthSessions'>;
  pages: MessengerPageOption[] | null;
  loadError: string | null;
};

export function MessengerPagePickerDialog({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const getPickerPages = useAction(api.messengerAuth.getPickerPages);
  const finalizePick = useAction(api.messengerAuth.finalizePick);

  const sessionIdRaw =
    searchParams.get('messenger') === 'pick'
      ? searchParams.get('session')
      : null;
  const sessionId = sessionIdRaw as Id<'oauthSessions'> | null;

  const [pagePickerState, setPagePickerState] =
    useState<PagePickerState | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    void (async () => {
      try {
        const { pages: loaded } = await getPickerPages({ sessionId });
        if (cancelled) return;
        setPagePickerState({
          sessionId,
          pages: loaded,
          loadError: null,
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setPagePickerState({
          sessionId,
          pages: null,
          loadError: message,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, getPickerPages]);

  const clearPickerParams = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('messenger');
    next.delete('session');
    next.delete('message');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handlePick = useCallback(
    (pageId: string) => {
      if (!sessionId) return;
      setPickingId(pageId);
      void (async () => {
        try {
          await finalizePick({ sessionId, pageId });
          toast.success('Messenger account connected');
          clearPickerParams();
          onConnected?.();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          toast.error(`Messenger connect failed: ${message}`);
        } finally {
          setPickingId(null);
        }
      })();
    },
    [sessionId, finalizePick, clearPickerParams, onConnected],
  );

  const open = sessionId !== null;
  const activeState =
    pagePickerState?.sessionId === sessionId ? pagePickerState : null;
  const pages = activeState?.pages ?? null;
  const loadError = activeState?.loadError ?? null;

  return (
    <Dialog open={open} modal>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85vh] w-full max-w-xl gap-4 overflow-y-auto p-6 sm:max-w-2xl sm:p-8"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {loadError ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              <CircleAlert className="size-6" />
            </div>
            <DialogTitle className="text-lg font-semibold sm:text-xl">
              Could not load Pages
            </DialogTitle>
            <DialogDescription className="max-w-prose">
              {loadError}
            </DialogDescription>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => clearPickerParams()}
            >
              Close
            </Button>
          </div>
        ) : pages === null ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center sm:py-10">
            <Spinner className="size-8 text-muted-foreground" />
            <DialogTitle className="text-lg font-semibold sm:text-xl">
              Loading your Pages
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                <Shimmer duration={2} spread={3}>
                  Fetching Facebook Pages
                </Shimmer>
              </div>
            </DialogDescription>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-prose flex-col gap-5 py-1">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-lg font-semibold sm:text-xl">
                Choose a Page
              </DialogTitle>
              <DialogDescription className="text-base leading-relaxed">
                You manage multiple Facebook Pages. Pick the one you want to
                connect to this workspace.
              </DialogDescription>
            </div>
            <ul className="flex max-h-[min(32rem,60vh)] w-full flex-col gap-3 overflow-y-auto">
              {pages.map((page) => {
                const isBusy = pickingId === page.id;
                return (
                  <li
                    key={page.id}
                    className="flex flex-row items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-foreground whitespace-normal [overflow-wrap:anywhere]">
                        {page.name ?? page.id}
                      </p>
                      <p className="font-mono text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere] break-all">
                        {page.id}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0"
                      disabled={pickingId !== null}
                      onClick={() => handlePick(page.id)}
                    >
                      {isBusy ? <Spinner className="size-3.5" /> : 'Use this Page'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
