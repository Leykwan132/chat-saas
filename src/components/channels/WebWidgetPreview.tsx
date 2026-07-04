import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { Globe, RotateCcw } from 'lucide-react';
import type { WebWidgetLayout } from '../../../shared/webWidgetLayouts';
import type { WebWidgetTheme } from '../../../shared/webWidgetThemes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWebWidgetPreviewConversation } from './useWebWidgetPreviewConversation';
import { LauncherAvatar } from './WebWidgetPreviewAvatars';
import { WebWidgetPreviewComposer } from './WebWidgetPreviewComposer';
import {
  WebWidgetPreviewDeviceToggle,
  type WebWidgetPreviewDevice,
} from './WebWidgetPreviewDeviceToggle';
import { WebWidgetPreviewFrame } from './WebWidgetPreviewFrame';
import { WebWidgetPreviewPanel } from './WebWidgetPreviewPanel';

type WebWidgetPreviewProps = {
  agentName: string;
  iconUrl?: string;
  layout: WebWidgetLayout;
  placeholder: string;
  poweredBy: boolean;
  publicKey: string;
  theme: WebWidgetTheme;
  className?: string;
};

export function WebWidgetPreview({
  agentName,
  iconUrl,
  layout,
  placeholder,
  poweredBy,
  publicKey,
  theme,
  className,
}: WebWidgetPreviewProps) {
  const displayName = agentName.trim() || 'AI Agent';
  const dark = theme === 'dark';
  const [draft, setDraft] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<WebWidgetPreviewDevice>('desktop');
  const widgetRef = useRef<HTMLDivElement>(null);
  const {
    loading: messagesLoading,
    messages,
    resetConversation,
    sendError,
    sending,
    sendMessage,
  } = useWebWidgetPreviewConversation(publicKey);
  const mobilePreview = previewDevice === 'mobile';
  const placeholderWords = useMemo(
    () => [
      placeholder,
      `Ask ${displayName} anything`,
      `Get help from ${displayName}`,
    ],
    [displayName, placeholder],
  );

  const hidePanel = () => {
    setPanelOpen(false);
    if (!draft.trim()) setFocused(false);
  };

  const sendPreviewMessage = () => {
    const content = draft.trim();
    setPanelOpen(true);
    setFocused(true);
    if (!content || sending) return;

    setDraft('');
    void sendMessage(content).then((sent) => {
      if (!sent) setDraft(content);
    });
  };

  const composerOpen = focused || Boolean(draft.trim());
  const focusComposer = () => {
    setFocused(true);
    setPanelOpen(true);
  };
  const hidePanelFromWidgetGap = (event: PointerEvent<HTMLDivElement>) => {
    if (panelOpen && event.target === event.currentTarget) hidePanel();
  };
  const resetPreviewConversation = () => {
    setDraft('');
    setFocused(false);
    setPanelOpen(false);
    resetConversation();
  };
  const widgetHeight =
    mobilePreview && panelOpen ? 'h-full' : panelOpen ? 'h-[440px]' : 'h-12';
  const launcherWidgetHeight =
    mobilePreview && panelOpen ? 'h-full' : panelOpen ? 'h-[430px]' : 'h-14';
  const mobileInputPanelClassName = 'bottom-16 left-0 right-0 top-0 w-full';
  const mobileLauncherPanelClassName = 'bottom-20 left-0 right-0 top-0 w-full';

  const renderComposer = (variant: 'bar' | 'panel') => (
    <WebWidgetPreviewComposer
      composerOpen={composerOpen}
      dark={dark}
      draft={draft}
      mobile={mobilePreview}
      placeholder={placeholder}
      placeholderWords={placeholderWords}
      variant={variant}
      onBarBlur={() => {
        if (!draft.trim()) setFocused(false);
      }}
      onDraftChange={setDraft}
      onFocus={focusComposer}
      sending={sending}
      onSubmit={sendPreviewMessage}
    />
  );

  return (
    <div
      className={cn(
        'relative flex min-h-[520px] flex-1 flex-col gap-4 text-foreground',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Preview</span>
        </div>
        <WebWidgetPreviewDeviceToggle
          value={previewDevice}
          onChange={setPreviewDevice}
        />
      </div>

      <WebWidgetPreviewFrame
        actions={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-8 border-border/70 bg-background/90 text-muted-foreground shadow-none backdrop-blur hover:bg-background hover:text-foreground"
            aria-label="Reset preview thread"
            title="Reset preview thread"
            disabled={sending}
            onClick={resetPreviewConversation}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <RotateCcw className="size-3.5" />
          </Button>
        }
        device={previewDevice}
        onPointerDownCapture={(event) => {
          if (
            panelOpen &&
            widgetRef.current &&
            !widgetRef.current.contains(event.target as Node)
          ) {
            hidePanel();
          }
        }}
      >
        {layout === 'input_bar' ? (
          <div
            ref={widgetRef}
            className={cn(
              'relative mx-auto flex w-full items-end transition-[height] duration-200 ease-in-out',
              widgetHeight,
              mobilePreview ? 'max-w-[390px]' : 'max-w-[460px]',
            )}
            onPointerDownCapture={hidePanelFromWidgetGap}
          >
            <WebWidgetPreviewPanel
              agentName={displayName}
              className={cn(
                mobilePreview
                  ? mobileInputPanelClassName
                  : 'bottom-16 left-1/2 -translate-x-1/2',
              )}
              fullScreen={mobilePreview}
              iconUrl={iconUrl}
              loading={messagesLoading}
              messages={messages}
              open={panelOpen}
              poweredBy={poweredBy}
              sendError={sendError}
              theme={theme}
              onClose={hidePanel}
            />
            {renderComposer('bar')}
          </div>
        ) : (
          <div
            ref={widgetRef}
            className={cn(
              'relative w-full max-w-[460px] transition-[height] duration-200 ease-in-out',
              launcherWidgetHeight,
              mobilePreview ? 'mx-auto max-w-[390px]' : layout === 'left_avatar' ? 'mr-auto' : 'ml-auto',
            )}
            onPointerDownCapture={hidePanelFromWidgetGap}
          >
            <WebWidgetPreviewPanel
              agentName={displayName}
              className={cn(
                mobilePreview
                  ? mobileLauncherPanelClassName
                  : cn(
                      'bottom-20 w-full',
                      layout === 'left_avatar' ? 'left-0' : 'right-0',
                    ),
              )}
              fullScreen={mobilePreview}
              iconUrl={iconUrl}
              loading={messagesLoading}
              messages={messages}
              open={panelOpen}
              poweredBy={poweredBy}
              sendError={sendError}
              theme={theme}
              onClose={hidePanel}
            >
              {renderComposer('panel')}
            </WebWidgetPreviewPanel>
            <div
              className={cn(
                'absolute bottom-0 flex flex-col items-center gap-2',
                layout === 'left_avatar' ? 'left-0' : 'right-0',
              )}
            >
              <button
                type="button"
                className={cn(
                  'flex size-14 items-center justify-center rounded-full shadow-sm ring-1 ring-black/10 transition hover:scale-[1.03]',
                  dark ? 'bg-black' : 'bg-white',
                )}
                aria-label="Open preview chat"
                onClick={() => {
                  setPanelOpen((current) => !current);
                  setFocused(true);
                }}
              >
                <LauncherAvatar iconUrl={iconUrl} name={displayName} theme={theme} />
              </button>
            </div>
          </div>
        )}
      </WebWidgetPreviewFrame>
    </div>
  );
}
