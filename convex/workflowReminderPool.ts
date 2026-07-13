import { Workpool } from '@convex-dev/workpool';
import { components } from './_generated/api';

export const workflowReminderWorkpool = new Workpool(
  components.workflowReminderWorkpool,
  { maxParallelism: 3, retryActionsByDefault: false },
);
