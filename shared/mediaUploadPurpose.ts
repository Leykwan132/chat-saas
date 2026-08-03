export const MediaUploadPurpose = {
  KnowledgeBase: 'knowledgeBase',
  WorkflowSendMedia: 'workflowSendMedia',
} as const;

export type MediaUploadPurpose =
  (typeof MediaUploadPurpose)[keyof typeof MediaUploadPurpose];
