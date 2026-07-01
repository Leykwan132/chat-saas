import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AtSign, Bold } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
import {
  WHATSAPP_TEMPLATE_PARAMETERS,
  findActiveAtTrigger,
} from '../../../shared/whatsappTemplateParameters';
import {
  measureCaretDropdownPosition,
  renderEditorText,
  type DropdownPosition,
} from './templateBodyEditorRendering';

type TemplateBodyEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TemplateBodyEditor({ value, onChange }: TemplateBodyEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const parameterOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [parameterOpen, setParameterOpen] = useState(false);
  const [activeTrigger, setActiveTrigger] = useState<ReturnType<typeof findActiveAtTrigger>>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({
    left: 8,
    top: 8,
  });
  const [highlightedParameterIndex, setHighlightedParameterIndex] = useState(0);

  const renderedEditorText = useMemo(() => renderEditorText(value), [value]);

  const filteredParameters = useMemo(() => {
    if (!activeTrigger?.query) return WHATSAPP_TEMPLATE_PARAMETERS;
    return WHATSAPP_TEMPLATE_PARAMETERS.filter((parameter) =>
      `${parameter.key} ${parameter.label}`.toLowerCase().includes(activeTrigger.query),
    );
  }, [activeTrigger]);
  const highlightedParameter = filteredParameters[highlightedParameterIndex] ?? null;

  useEffect(() => {
    if (!parameterOpen) return;
    parameterOptionRefs.current[highlightedParameterIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedParameterIndex, parameterOpen]);

  const setCursor = (position: number) => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(position, position);
    });
  };

  const updateActiveTrigger = (
    text: string,
    cursor: number,
    textarea: HTMLTextAreaElement | null = textareaRef.current,
  ) => {
    const trigger = findActiveAtTrigger(text, cursor);
    if ((trigger?.query ?? null) !== (activeTrigger?.query ?? null)) {
      setHighlightedParameterIndex(0);
    }
    setActiveTrigger(trigger);
    setParameterOpen(trigger !== null);
    if (trigger !== null && textarea && rootRef.current) {
      setDropdownPosition(measureCaretDropdownPosition(textarea, rootRef.current, cursor));
    }
  };

  const syncScroll = () => {
    if (!textareaRef.current || !mirrorRef.current) return;
    mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    mirrorRef.current.scrollLeft = textareaRef.current.scrollLeft;
    const cursor = textareaRef.current.selectionStart;
    updateActiveTrigger(value, cursor, textareaRef.current);
  };

  const insertParameter = (key: string) => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? value.length;
    const trigger = activeTrigger ?? findActiveAtTrigger(value, cursor);
    const start = trigger?.start ?? cursor;
    const end = trigger?.end ?? cursor;
    const token = `@${key}`;
    const nextCharacter = value.slice(end, end + 1);
    const spacer = nextCharacter && !nextCharacter.trim() ? '' : ' ';
    const next = `${value.slice(0, start)}${token}${spacer}${value.slice(end)}`;
    onChange(next);
    setParameterOpen(false);
    setActiveTrigger(null);
    setHighlightedParameterIndex(0);
    setCursor(start + token.length + spacer.length);
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!parameterOpen) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (filteredParameters.length === 0) return;
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setHighlightedParameterIndex(
        (current) => (current + direction + filteredParameters.length) % filteredParameters.length,
      );
      return;
    }

    if (event.key === 'Enter' && highlightedParameter) {
      event.preventDefault();
      insertParameter(highlightedParameter.key);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setParameterOpen(false);
      setActiveTrigger(null);
    }
  };

  const applyBold = () => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const replacement = selected ? `*${selected}*` : '**';
    const next = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
    onChange(next);
    setCursor(selected ? start + replacement.length : start + 1);
  };

  const openParameterMenuFromButton = (button: HTMLButtonElement) => {
    if (!rootRef.current) return;
    const rootRect = rootRef.current.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    setActiveTrigger(null);
    setHighlightedParameterIndex(0);
    setDropdownPosition({
      left: Math.max(buttonRect.left - rootRect.left, 8),
      top: buttonRect.bottom - rootRect.top + 4,
    });
    setParameterOpen((open) => !open);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      <InputGroup className="min-h-[254px] !rounded-lg has-data-[align=block-end]:!rounded-lg has-[>[data-align=block-end]]:!rounded-lg has-[textarea]:!rounded-lg">
        <div className="relative min-h-[220px] w-full flex-1">
          <div
            ref={mirrorRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden whitespace-pre-wrap break-words px-4 py-4 font-sans text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]"
          >
            {value ? (
              renderedEditorText
            ) : (
              <span className="text-muted-foreground/50">
                Type your WhatsApp message. Use @ to insert customer and booking parameters.
              </span>
            )}
          </div>
          <InputGroupTextarea
            ref={textareaRef}
            id="tpl-body"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              updateActiveTrigger(
                event.target.value,
                event.target.selectionStart,
                event.currentTarget,
              );
            }}
            onScroll={syncScroll}
            onKeyDown={handleTextareaKeyDown}
            onClick={(event) => {
              updateActiveTrigger(value, event.currentTarget.selectionStart, event.currentTarget);
            }}
            onKeyUp={(event) => {
              if (
                parameterOpen &&
                ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)
              ) {
                return;
              }
              updateActiveTrigger(value, event.currentTarget.selectionStart, event.currentTarget);
            }}
            placeholder="Type your WhatsApp message. Use @ to insert customer and booking parameters."
            maxLength={1024}
            spellCheck={false}
            required
            className="relative z-0 min-h-[220px] px-4 py-4 text-sm leading-relaxed text-transparent caret-foreground placeholder:text-transparent selection:bg-primary/20 selection:text-transparent [overflow-wrap:anywhere]"
          />
        </div>
        <InputGroupAddon align="block-end" className="justify-between">
          <div className="flex items-center gap-1">
            <InputGroupButton
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Insert parameter"
              aria-expanded={parameterOpen}
              onClick={(event) => openParameterMenuFromButton(event.currentTarget)}
            >
              <AtSign />
            </InputGroupButton>
            <InputGroupButton
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Bold"
              onClick={applyBold}
            >
              <Bold />
            </InputGroupButton>
          </div>
          <span
            className={cn(
              'text-[10px] font-medium',
              value.length >= 1024 ? 'text-destructive font-bold' : 'text-muted-foreground',
            )}
          >
            {value.length}/1024 chars
          </span>
        </InputGroupAddon>
      </InputGroup>

      {parameterOpen && (
        <div
          className="absolute w-fit min-w-52 max-w-[min(16rem,calc(100%-16px))] rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-md"
          style={{
            left: dropdownPosition.left,
            top: dropdownPosition.top,
          }}
          role="listbox"
        >
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {filteredParameters.map((parameter, index) => (
              <button
                key={parameter.key}
                ref={(element) => {
                  parameterOptionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={index === highlightedParameterIndex}
                onClick={() => insertParameter(parameter.key)}
                onMouseEnter={() => setHighlightedParameterIndex(index)}
                className={cn(
                  'flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors',
                  index === highlightedParameterIndex ? 'bg-muted' : 'hover:bg-muted',
                )}
              >
                <span className="text-sm font-semibold text-foreground">
                  @{parameter.key}
                </span>
                <span className="text-xs text-muted-foreground">
                  {parameter.example}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
