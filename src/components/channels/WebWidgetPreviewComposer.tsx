import { ArrowUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { WebWidgetTypingPlaceholderInput } from './WebWidgetTypingPlaceholderInput';

type WebWidgetPreviewComposerProps = {
  composerOpen: boolean;
  dark: boolean;
  draft: string;
  mobile?: boolean;
  placeholder: string;
  placeholderWords: string[];
  sending?: boolean;
  variant: 'bar' | 'panel';
  onBarBlur: () => void;
  onDraftChange: (value: string) => void;
  onFocus: () => void;
  onSubmit: () => void;
};

export function WebWidgetPreviewComposer({
  composerOpen,
  dark,
  draft,
  mobile = false,
  placeholder,
  placeholderWords,
  sending = false,
  variant,
  onBarBlur,
  onDraftChange,
  onFocus,
  onSubmit,
}: WebWidgetPreviewComposerProps) {
  const collapsedBarWidth = mobile ? 236 : 280;
  const expandedBarWidth = mobile ? 390 : 420;

  return (
    <motion.form
      animate={
        variant === 'bar'
          ? {
              maxWidth: composerOpen ? expandedBarWidth : collapsedBarWidth,
              y: composerOpen ? -2 : 0,
              boxShadow: composerOpen
                ? '0 6px 18px rgba(15, 23, 42, 0.1)'
                : '0 2px 10px rgba(15, 23, 42, 0.08)',
            }
          : undefined
      }
      className={cn(
        'flex items-center gap-2 rounded-full border bg-card',
        variant === 'bar' ? 'mx-auto h-12 w-full pl-6 pr-3' : 'h-11 px-2 pl-4',
        dark ? 'border-white/10 bg-black text-white' : 'border-border bg-white text-black',
      )}
      transition={
        variant === 'bar'
          ? {
              type: 'spring',
              stiffness: 420,
              damping: 34,
              mass: 0.8,
            }
          : undefined
      }
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <WebWidgetTypingPlaceholderInput
        className="caret-current"
        placeholderClassName={dark ? 'text-white/40' : 'text-black/35'}
        value={draft}
        onBlur={() => {
          if (variant === 'bar') onBarBlur();
        }}
        onChange={(event) => onDraftChange(event.target.value)}
        onFocus={onFocus}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
          event.preventDefault();
          if (draft.trim()) onSubmit();
        }}
        placeholder={placeholder}
        placeholderWords={placeholderWords}
      />
      <button
        type="submit"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50',
          dark ? 'bg-white text-black hover:bg-white/85' : 'bg-black text-white hover:bg-black/80',
        )}
        aria-label="Send preview message"
        disabled={sending || !draft.trim()}
      >
        <ArrowUp className="size-4" />
      </button>
    </motion.form>
  );
}
