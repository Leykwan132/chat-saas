/** Client PUT to a signed R2 URL (same behavior as @convex-dev/r2). */
export async function uploadWithProgress(
  url: string,
  file: File,
  onProgress?: (progress: { loaded: number; total: number }) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        onProgress({ loaded: event.loaded, total: event.total });
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Failed to upload file: ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Failed to upload file"));
    xhr.send(file);
  });
}
