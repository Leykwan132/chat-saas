import { useState } from "react";
import {
  Attachment,
  AttachmentPreview,
  Attachments,
  getAttachmentLabel,
  getMediaCategory,
  type AttachmentData,
} from "@/components/ai-elements/attachments";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function InboxImageLightbox({
  file,
  open,
  onOpenChange,
}: {
  file: AttachmentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!file || file.type !== "file" || !file.url) return null;

  const label = getAttachmentLabel(file);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "fixed inset-0 z-50 m-0 h-svh w-svw max-w-none translate-none transform-none",
          "top-0 left-0 rounded-none border-0 bg-black/50 p-0 shadow-none ring-0 supports-backdrop-filter:backdrop-blur-sm",
          "sm:top-0 sm:left-0 sm:max-w-none",
          "data-open:fade-in-0 data-closed:fade-out-0",
          "[&_[data-slot=dialog-close]]:z-10 [&_[data-slot=dialog-close]]:bg-white/10",
          "[&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/20",
        )}
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <div
          className="absolute inset-0 flex cursor-default items-center justify-center p-4"
          onClick={() => onOpenChange(false)}
        >
          <img
            src={file.url}
            alt={label}
            className="max-h-full max-w-full cursor-default object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function InboxMessageAttachments({
  files,
  isCustomer,
}: {
  files: AttachmentData[];
  isCustomer: boolean;
}) {
  const [lightboxFile, setLightboxFile] = useState<AttachmentData | null>(null);

  if (files.length === 0) return null;

  return (
    <>
      <Attachments
        className={cn(
          "w-fit",
          isCustomer ? "ml-0 justify-start" : "ml-auto justify-end",
        )}
        variant="grid"
      >
        {files.map((file) => {
          const isImage =
            file.type === "file" &&
            getMediaCategory(file) === "image" &&
            Boolean(file.url);

          const sizeClass =
            files.length === 1
              ? "size-48"
              : files.length === 2
                ? "size-32"
                : "size-24";

          return (
            <Attachment
              key={file.id}
              className={cn(
                sizeClass,
                "max-w-[min(240px,100%)]",
                isImage && "cursor-zoom-in",
              )}
              data={file}
              role={isImage ? "button" : undefined}
              tabIndex={isImage ? 0 : undefined}
              aria-label={
                isImage ? `View ${getAttachmentLabel(file)}` : undefined
              }
              onClick={isImage ? () => setLightboxFile(file) : undefined}
              onKeyDown={
                isImage
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setLightboxFile(file);
                      }
                    }
                  : undefined
              }
            >
              <AttachmentPreview />
            </Attachment>
          );
        })}
      </Attachments>
      <InboxImageLightbox
        file={lightboxFile}
        open={lightboxFile !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxFile(null);
        }}
      />
    </>
  );
}
