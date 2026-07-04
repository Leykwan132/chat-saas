import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from '@/components/ai-elements/artifact';
import { CodeBlock } from '@/components/ai-elements/code-block';
import { CopyIcon, DownloadIcon } from 'lucide-react';

type WebWidgetScriptArtifactProps = {
  code: string;
  onCopy: () => void;
  onDownload: () => void;
};

export function WebWidgetScriptArtifact({
  code,
  onCopy,
  onDownload,
}: WebWidgetScriptArtifactProps) {
  return (
    <Artifact className="shadow-none">
      <ArtifactHeader className="px-3 py-2">
        <div>
          <ArtifactTitle className="text-xs">Website installation</ArtifactTitle>
          <ArtifactDescription className="text-xs">
            Paste this inside the body tag of your HTML file.
          </ArtifactDescription>
        </div>
        <ArtifactActions className="gap-0.5">
          <ArtifactAction
            className="size-7"
            icon={CopyIcon}
            label="Copy"
            onClick={onCopy}
            tooltip="Copy installation"
          />
          <ArtifactAction
            className="size-7"
            icon={DownloadIcon}
            label="Download"
            onClick={onDownload}
            tooltip="Download installation"
          />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="p-0">
        <CodeBlock
          className="max-h-36 rounded-none border-none text-xs"
          code={code}
          language="html"
        />
      </ArtifactContent>
    </Artifact>
  );
}
