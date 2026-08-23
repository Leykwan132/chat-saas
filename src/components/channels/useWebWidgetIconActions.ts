import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import type { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type WebWidgetIconActionsProps = {
  agentId: Id<"agents"> | undefined;
  canUseCustomIcon: boolean;
  generateIconUploadUrl: ReturnType<
    typeof useMutation<typeof api.webWidget.generateIconUploadUrl>
  >;
  removeIcon: ReturnType<typeof useMutation<typeof api.webWidget.removeIcon>>;
  saveIcon: ReturnType<typeof useMutation<typeof api.webWidget.saveIcon>>;
};

export function useWebWidgetIconActions({
  agentId,
  canUseCustomIcon,
  generateIconUploadUrl,
  removeIcon,
  saveIcon,
}: WebWidgetIconActionsProps) {
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const uploadIcon = useCallback(
    (file: File | undefined) => {
      if (!file || !agentId || !canUseCustomIcon) return;
      setUploadingIcon(true);
      void (async () => {
        const uploadUrl = await generateIconUploadUrl({ agentId });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!response.ok) throw new Error("Icon upload failed");
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        await saveIcon({ agentId, storageId });
        toast.success("Icon updated");
      })()
        .catch((error) =>
          toast.error(error instanceof Error ? error.message : String(error)),
        )
        .finally(() => setUploadingIcon(false));
    },
    [agentId, canUseCustomIcon, generateIconUploadUrl, saveIcon],
  );

  const clearIcon = useCallback(() => {
    if (!agentId || !canUseCustomIcon || uploadingIcon) return;
    setUploadingIcon(true);
    void removeIcon({ agentId })
      .then(() => toast.success("Avatar removed"))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => setUploadingIcon(false));
  }, [agentId, canUseCustomIcon, removeIcon, uploadingIcon]);

  return { clearIcon, uploadingIcon, uploadIcon };
}
