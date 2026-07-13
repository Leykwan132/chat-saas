import { Workpool } from '@convex-dev/workpool';
import { components } from './_generated/api';

export const workflowFollowUpWorkpool = new Workpool(
  components.workflowFollowUpWorkpool,
  { maxParallelism: 3, retryActionsByDefault: false },
);
