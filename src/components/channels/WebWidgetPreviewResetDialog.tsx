import { cn } from "@/lib/utils";

type WebWidgetPreviewResetDialogProps = {
  dark: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function WebWidgetPreviewResetDialog({
  dark,
  onCancel,
  onConfirm,
}: WebWidgetPreviewResetDialogProps) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-black/30 p-5">
      <section
        className={cn(
          "w-full max-w-[280px] rounded-xl border p-4",
          dark
            ? "border-white/10 bg-zinc-900 text-zinc-100"
            : "border-zinc-200 bg-white text-zinc-950",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-reset-dialog-title"
      >
        <h2 id="preview-reset-dialog-title" className="text-sm font-medium">
          Start a new chat?
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Your previous messages will no longer appear here.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-blue-500 px-3 py-2 text-sm text-white"
            onClick={onConfirm}
          >
            Start new chat
          </button>
        </div>
      </section>
    </div>
  );
}
