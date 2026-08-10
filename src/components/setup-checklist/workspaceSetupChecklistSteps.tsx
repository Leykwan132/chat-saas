import type { WorkspaceSetupChecklistStepKey } from './workspaceSetupChecklistNavigation';

export type WorkspaceSetupChecklistStepMeta = {
  key: WorkspaceSetupChecklistStepKey;
  title: string;
  hoverTitle: string;
  hoverDescription: string;
};

export const workspaceSetupChecklistSteps: WorkspaceSetupChecklistStepMeta[] = [
  {
    key: 'createAgent',
    title: 'Create your first agent',
    hoverTitle: 'Create agent',
    hoverDescription: 'Open the agent builder and choose the first agent template for this workspace.',
  },
  {
    key: 'uploadKnowledgeBase',
    title: 'Add knowledge to your agent',
    hoverTitle: 'Add knowledge',
    hoverDescription: 'Open Knowledge Base and add a website, file, text note, or Q&A item.',
  },
  {
    key: 'testAgent',
    title: 'Test your agent',
    hoverTitle: 'Test agent',
    hoverDescription: 'Open the test chat to check tone, knowledge, and response quality.',
  },
  {
    key: 'createWorkflow',
    title: 'Create an AI workflow',
    hoverTitle: 'Create an AI workflow',
    hoverDescription: 'Open Workflow and add the first branch, reply, handoff, or automation node.',
  },
  {
    key: 'createService',
    title: 'Create a service',
    hoverTitle: 'Create a service',
    hoverDescription: 'Open Services and create something customers can book.',
  },
  {
    key: 'connectChannel',
    title: 'Connect a channel',
    hoverTitle: 'Connect channel',
    hoverDescription: 'Open Channels and connect Website, WhatsApp, Instagram, or Messenger.',
  },
];
