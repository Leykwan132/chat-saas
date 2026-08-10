import type { ReactNode } from 'react';

interface FileUploadDropzoneContainerProps {
  children: ReactNode;
}

export function FileUploadDropzoneContainer({ children }: FileUploadDropzoneContainerProps) {
  return <div className="rounded-lg p-4">{children}</div>;
}
