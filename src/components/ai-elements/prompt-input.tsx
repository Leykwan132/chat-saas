"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Send } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ComponentProps,
  type FormEvent,
} from "react";

export type PromptInputMessage = {
  text: string;
};

type PromptInputContextValue = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  submit: () => void;
};

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

const usePromptInput = () => {
  const ctx = useContext(PromptInputContext);
  if (!ctx) {
    throw new Error(
      "PromptInput components must be used within <PromptInput>"
    );
  }
  return ctx;
};

export type PromptInputProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  onSubmit: (message: PromptInputMessage) => void;
};

export const PromptInput = ({
  onSubmit,
  className,
  children,
  ...props
}: PromptInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(() => {
    const text = textareaRef.current?.value ?? "";
    if (text.trim()) {
      onSubmit({ text: text.trim() });
    }
  }, [onSubmit]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <PromptInputContext.Provider value={{ textareaRef, submit }}>
      <form onSubmit={handleSubmit} className={className} {...props}>
        {children}
      </form>
    </PromptInputContext.Provider>
  );
};

export type PromptInputTextareaProps = ComponentProps<"textarea"> & {
  inputRef?: React.Ref<HTMLTextAreaElement | null>;
};

export const PromptInputTextarea = ({
  className,
  onKeyDown,
  inputRef,
  ...props
}: PromptInputTextareaProps) => {
  const { textareaRef, submit } = usePromptInput();

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof inputRef === "function") {
        inputRef(node);
      } else if (inputRef) {
        (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current =
          node;
      }
    },
    [textareaRef, inputRef]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    onKeyDown?.(e);
  };

  return (
    <textarea
      ref={setRefs}
      data-slot="prompt-input-textarea"
      onKeyDown={handleKeyDown}
      className={cn(
        "flex w-full min-w-0 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-base transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 field-sizing-content resize-none",
        className
      )}
      {...props}
    />
  );
};

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: "ready" | "streaming" | "submitted";
};

export const PromptInputSubmit = ({
  status = "ready",
  children,
  ...props
}: PromptInputSubmitProps) => {
  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <Button
      type="submit"
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      {children ?? (
        isStreaming ? <Spinner className="size-4" /> : <Send className="size-4" />
      )}
    </Button>
  );
};
