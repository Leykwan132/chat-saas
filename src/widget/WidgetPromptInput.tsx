import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

type WidgetPromptInputProps = {
  disabled?: boolean;
  placeholder: string;
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void | Promise<void>;
};

function resizeTextarea(element: HTMLTextAreaElement) {
  if (!element.value) {
    element.style.height = "58px";
    element.style.overflowY = "hidden";
    return;
  }
  element.style.height = "0px";
  const height = Math.min(Math.max(element.scrollHeight, 58), 130);
  element.style.height = `${height}px`;
  element.style.overflowY = element.scrollHeight > 130 ? "auto" : "hidden";
}

export function WidgetPromptInput({
  disabled = false,
  placeholder,
  suggestions,
  value,
  onChange,
  onSubmit,
}: WidgetPromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  useLayoutEffect(() => {
    if (textareaRef.current) resizeTextarea(textareaRef.current);
  }, [value]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || !value.trim()) return;
    void onSubmit(value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      isComposing ||
      event.nativeEvent.isComposing
    )
      return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <div className="prompt-stack">
      {suggestions.length > 0 ? (
        <div className="widget-suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => void onSubmit(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      <form className="composer" onSubmit={submit}>
        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          onChange={(event) => onChange(event.currentTarget.value)}
          onCompositionEnd={() => setIsComposing(false)}
          onCompositionStart={() => setIsComposing(true)}
          onKeyDown={handleKeyDown}
        />
        <div className="composer-actions">
          <button type="submit" disabled={disabled || !value.trim()}>
            ↑
          </button>
        </div>
      </form>
    </div>
  );
}
