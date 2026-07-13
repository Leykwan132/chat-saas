import { v } from 'convex/values';

export const workflowAutomationActivationScopeValidator = v.union(
  v.literal('currentAndFuture'),
  v.literal('futureOnly'),
);

const workflowWhatsappTemplateButtonValidator = v.object({
  type: v.union(
    v.literal('QUICK_REPLY'),
    v.literal('URL'),
    v.literal('PHONE_NUMBER'),
    v.literal('COPY_CODE'),
  ),
  text: v.string(),
  url: v.optional(v.string()),
  phone_number: v.optional(v.string()),
  example: v.optional(v.string()),
});

export const workflowWhatsappTemplateSnapshotValidator = v.object({
  key: v.string(),
  name: v.string(),
  language: v.string(),
  category: v.string(),
  components: v.optional(v.array(v.object({
    type: v.string(),
    format: v.optional(v.string()),
    text: v.optional(v.string()),
    r2Key: v.optional(v.string()),
    buttons: v.optional(v.array(workflowWhatsappTemplateButtonValidator)),
  }))),
});

export const workflowReminderAutomationConfigValidator = v.object({
  enabled: v.boolean(),
  activationScope: v.optional(workflowAutomationActivationScopeValidator),
  revision: v.number(),
  selections: v.record(v.string(), v.string()),
  timingOptionIds: v.array(v.string()),
  customTimingOptions: v.array(v.object({
    amount: v.number(),
    id: v.string(),
    label: v.string(),
    summaryLabel: v.string(),
    unit: v.union(
      v.literal('minutes'),
      v.literal('hours'),
      v.literal('days'),
      v.literal('weeks'),
    ),
  })),
  template: v.optional(workflowWhatsappTemplateSnapshotValidator),
});

export const workflowFollowUpAutomationConfigValidator = v.object({
  enabled: v.boolean(),
  activationScope: v.optional(workflowAutomationActivationScopeValidator),
  revision: v.number(),
  selections: v.record(v.string(), v.string()),
  audienceFilters: v.array(v.string()),
  startAfterHours: v.number(),
  intervalHours: v.number(),
  maxAttempts: v.number(),
  messageStrategy: v.union(v.literal('same'), v.literal('different')),
  sameTemplate: v.optional(workflowWhatsappTemplateSnapshotValidator),
  attemptTemplates: v.array(workflowWhatsappTemplateSnapshotValidator),
});

export const workflowAutomationConfigsValidator = v.object({
  reminder: workflowReminderAutomationConfigValidator,
  followUp: workflowFollowUpAutomationConfigValidator,
});
