import type {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
} from 'react';
import { TypingAnimation } from '@/registry/magicui/typing-animation';
import { cn } from '@/lib/utils';

type WebWidgetTypingPlaceholderInputProps = {
  value: string;
  placeholder: string;
  placeholderWords?: string[];
  className?: string;
  placeholderClassName?: string;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFocus: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export function WebWidgetTypingPlaceholderInput({
  value,
  placeholder,
  placeholderWords,
  className,
  placeholderClassName,
  onBlur,
  onChange,
  onFocus,
  onKeyDown,
}: WebWidgetTypingPlaceholderInputProps) {
  const words = placeholderWords?.length ? placeholderWords : [placeholder];

  return (
    <div className="relative min-w-0 flex-1">
      {!value ? (
        <TypingAnimation
          key={words.join('\u0000')}
          className={cn(
            'pointer-events-none absolute left-0 top-1/2 max-w-full -translate-y-1/2 overflow-hidden whitespace-nowrap text-sm !leading-none !tracking-normal',
            placeholderClassName,
          )}
          duration={38}
          deleteSpeed={22}
          loop
          pauseDelay={900}
          showCursor={false}
          startOnView={false}
          words={words}
        />
      ) : null}
      <input
        aria-label={placeholder}
        className={cn(
          'relative z-10 min-w-0 w-full bg-transparent text-sm text-current outline-none',
          className,
        )}
        value={value}
        onBlur={onBlur}
        onChange={onChange}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
