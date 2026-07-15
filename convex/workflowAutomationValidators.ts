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

const workflowWhatsappTemplateNamedParameterExampleValidator = v.object({
  param_name: v.string(),
  example: v.string(),
});

const workflowWhatsappTemplateExampleValidator = v.union(
  v.object({ header_handle: v.array(v.string()) }),
  v.object({ header_text: v.array(v.string()) }),
  v.object({
    header_text_named_params: v.array(
      workflowWhatsappTemplateNamedParameterExampleValidator,
    ),
  }),
  v.object({ body_text: v.array(v.array(v.string())) }),
  v.object({
    body_text_named_params: v.array(
      workflowWhatsappTemplateNamedParameterExampleValidator,
    ),
  }),
);

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
    example: v.optional(workflowWhatsappTemplateExampleValidator),
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

const workflowFollowupCustomStartAfterValidator = v.object({
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
});

const workflowFollowUpAutomationConfigFields = {
  enabled: v.boolean(),
  activationScope: v.optional(workflowAutomationActivationScopeValidator),
  revision: v.number(),
  selections: v.record(v.string(), v.string()),
  audienceFilters: v.array(v.string()),
  customStartAfter: v.optional(workflowFollowupCustomStartAfterValidator),
  intervalHours: v.number(),
  maxAttempts: v.number(),
  messageStrategy: v.union(v.literal('same'), v.literal('different')),
  sameTemplate: v.optional(workflowWhatsappTemplateSnapshotValidator),
  attemptTemplates: v.array(workflowWhatsappTemplateSnapshotValidator),
};

export const workflowFollowUpAutomationConfigValidator = v.object({
  ...workflowFollowUpAutomationConfigFields,
  startAfterMinutes: v.optional(v.number()),
  startAfterHours: v.optional(v.number()),
});

const workflowFollowUpAutomationSaveConfigValidator = v.object({
  ...workflowFollowUpAutomationConfigFields,
  startAfterMinutes: v.number(),
  startAfterHours: v.optional(v.number()),
});

export const workflowAutomationConfigsValidator = v.object({
  reminder: workflowReminderAutomationConfigValidator,
  followUp: workflowFollowUpAutomationSaveConfigValidator,
});
