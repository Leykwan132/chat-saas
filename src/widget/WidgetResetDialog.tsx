type WidgetResetDialogProps = {
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function WidgetResetDialog({
  disabled,
  onCancel,
  onConfirm,
}: WidgetResetDialogProps) {
  return (
    <div className="reset-dialog-backdrop">
      <section
        className="reset-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-dialog-title"
      >
        <h2 id="reset-dialog-title">Start a new chat?</h2>
        <p>Your previous messages will no longer appear here.</p>
        <div className="reset-dialog-actions">
          <button type="button" onClick={onCancel} disabled={disabled}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={disabled}>
            Start new chat
          </button>
        </div>
      </section>
    </div>
  );
}
