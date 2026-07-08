type SendMediaNodeKind = 'sendImage' | 'sendFile';

export function getWorkflowSendMediaCopy(
  nodeKind: SendMediaNodeKind,
  uploadedCount: number,
  isLoading: boolean,
) {
  const isFileNode = nodeKind === 'sendFile';
  const loadingLabel = isFileNode ? 'files' : 'photos/videos';

  return {
    title: isFileNode ? 'Files to send' : 'Your Photos/Videos',
    status: isLoading ? `Loading ${loadingLabel}` : `${uploadedCount} uploaded`,
  };
}
