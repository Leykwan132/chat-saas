import { type ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PartnerPanel({
  className,
  ...props
}: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "rounded-lg border border-border bg-card shadow-none ring-0",
        className,
      )}
      {...props}
    />
  );
}
