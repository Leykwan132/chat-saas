import type { PointerEvent, ReactNode } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import type { WebWidgetPreviewDevice } from "./WebWidgetPreviewDeviceToggle";

type WebWidgetPreviewFrameProps = {
  children: ReactNode;
  device: WebWidgetPreviewDevice;
  actions?: ReactNode;
  onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => void;
};

export function WebWidgetPreviewFrame({
  actions,
  children,
  device,
  onPointerDownCapture,
}: WebWidgetPreviewFrameProps) {
  const mobile = device === "mobile";

  return (
    <div
      className={cn(
        "grid flex-1 justify-items-center p-4",
        mobile ? "min-h-[620px] items-start" : "items-start pt-6",
      )}
    >
      <div
        className={
          mobile ? "mx-auto shrink-0" : "mx-auto w-full max-w-[480px]"
        }
        style={mobile ? { width: "min(22rem, calc(100vw - 4rem))" } : undefined}
      >
        <AspectRatio
          ratio={mobile ? 6 / 13 : 2 / 3}
          className={cn(
            "relative overflow-hidden border border-border bg-muted",
            mobile ? "rounded-[2.25rem]" : "rounded-lg",
          )}
        >
          {actions ? (
            <div className="absolute right-3 top-3 z-20">{actions}</div>
          ) : null}
          <div
            className={cn(
              "absolute inset-0 flex items-end justify-center overflow-hidden",
              mobile ? "px-4 py-6" : "p-4",
            )}
            onPointerDownCapture={onPointerDownCapture}
          >
            {children}
          </div>
        </AspectRatio>
      </div>
    </div>
  );
}
