"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type MessageProps = ComponentProps<"div"> & {
  from?: "user" | "assistant";
};

export const Message = ({ from, className, ...props }: MessageProps) => (
  <div
    className={cn(
      "flex",
      from === "user" ? "justify-end" : "justify-start",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = ComponentProps<"div">;

export const MessageContent = ({
  className,
  ...props
}: MessageContentProps) => (
  <div className={cn("", className)} {...props} />
);

export type MessageResponseProps = ComponentProps<"div">;

export const MessageResponse = ({
  className,
  ...props
}: MessageResponseProps) => (
  <div
    className={cn(
      "text-base text-foreground leading-relaxed pt-1 prose prose-sm dark:prose-invert max-w-none",
      className
    )}
    {...props}
  />
);
