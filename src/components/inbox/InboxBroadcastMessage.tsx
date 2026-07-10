import { ExternalLink, FileText, Megaphone } from "lucide-react";
import type { ReactNode } from "react";
import type {
  BroadcastHeaderAsset,
  BroadcastPresentation,
} from "../../../shared/broadcastMessage";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function BroadcastHeader({ asset }: { asset: BroadcastHeaderAsset }) {
  if (asset.headerFormat === "IMAGE") {
    return (
      <a href={asset.url} target="_blank" rel="noreferrer" className="block">
        <img
          src={asset.url}
          alt={asset.filename}
          className="max-h-72 w-full bg-muted object-contain"
        />
      </a>
    );
  }

  if (asset.headerFormat === "VIDEO") {
    return (
      <video
        src={asset.url}
        controls
        preload="metadata"
        className="max-h-72 w-full bg-black"
      />
    );
  }

  if (asset.headerFormat === "DOCUMENT") {
    return (
      <a
        href={asset.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 px-3 py-3 text-sm hover:bg-muted/70"
      >
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{asset.filename}</span>
        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
      </a>
    );
  }

  return null;
}

export function InboxBroadcastMessage({
  presentation,
  children,
}: {
  presentation?: BroadcastPresentation;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "ml-auto max-w-full overflow-hidden rounded-md border border-border bg-muted/40 text-foreground",
        presentation?.headerAsset ? "w-[min(320px,100%)]" : "w-fit min-w-48",
      )}
    >
      {presentation?.headerAsset ? (
        <BroadcastHeader asset={presentation.headerAsset} />
      ) : null}
      {children ? (
        <div className="px-3 py-2 text-sm leading-snug whitespace-pre-wrap break-words">
          {children}
        </div>
      ) : null}
      <Separator />
      <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        <Megaphone className="size-3" />
        <span>Broadcast</span>
      </div>
    </div>
  );
}
