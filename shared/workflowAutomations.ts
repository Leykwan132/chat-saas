export type WorkflowAutomationActivationScope = 'currentAndFuture' | 'futureOnly';

export type WorkflowWhatsappTemplateNamedParameterExample = {
  param_name: string;
  example: string;
};

export type WorkflowWhatsappTemplateExample =
  | { header_handle: string[] }
  | { header_text: string[] }
  | {
      header_text_named_params: WorkflowWhatsappTemplateNamedParameterExample[];
    }
  | { body_text: string[][] }
  | {
      body_text_named_params: WorkflowWhatsappTemplateNamedParameterExample[];
    };

export type WorkflowWhatsappTemplateComponent = {
  type: string;
  format?: string;
  text?: string;
  r2Key?: string;
  example?: WorkflowWhatsappTemplateExample;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
    text: string;
    url?: string;
    phone_number?: string;
    example?: string;
  }>;
};

export type WorkflowWhatsappTemplateSnapshot = {
  key: string;
  name: string;
  language: string;
  category: string;
  components?: WorkflowWhatsappTemplateComponent[];
};

export type WorkflowReminderCustomTiming = {
  amount: number;
  id: string;
  label: string;
  summaryLabel: string;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
};

export type WorkflowReminderAutomationConfig = {
  enabled: boolean;
  activationScope?: WorkflowAutomationActivationScope;
  revision: number;
  selections: Record<string, string>;
  timingOptionIds: string[];
  customTimingOptions: WorkflowReminderCustomTiming[];
  template?: WorkflowWhatsappTemplateSnapshot;
};

export type WorkflowFollowupStartAfterUnit =
  | 'minutes'
  | 'hours'
  | 'days'
  | 'weeks';

export type WorkflowFollowupCustomStartAfter = {
  amount: number;
  id: string;
  label: string;
  summaryLabel: string;
  unit: WorkflowFollowupStartAfterUnit;
};

export type WorkflowFollowupStartAfterSelection =
  WorkflowFollowupCustomStartAfter & {
    startAfterMinutes: number;
  };

export type WorkflowFollowUpAutomationConfig = {
  enabled: boolean;
  activationScope?: WorkflowAutomationActivationScope;
  revision: number;
  selections: Record<string, string>;
  audienceFilters: string[];
  startAfterMinutes: number;
  startAfterHours?: number;
  customStartAfter?: WorkflowFollowupCustomStartAfter;
  intervalHours: number;
  maxAttempts: number;
  messageStrategy: 'same' | 'different';
  sameTemplate?: WorkflowWhatsappTemplateSnapshot;
  attemptTemplates: WorkflowWhatsappTemplateSnapshot[];
};

export type WorkflowAutomationConfigs = {
  reminder: WorkflowReminderAutomationConfig;
  followUp: WorkflowFollowUpAutomationConfig;
};

export function applyWorkflowReminderCustomTiming(
  reminder: WorkflowReminderAutomationConfig,
  option: WorkflowReminderCustomTiming,
): WorkflowReminderAutomationConfig {
  const storedOption: WorkflowReminderCustomTiming = {
    amount: option.amount,
    id: option.id,
    label: option.label,
    summaryLabel: option.summaryLabel,
    unit: option.unit,
  };
  const customTimingOptions = reminder.customTimingOptions.some(
    (current) => current.id === storedOption.id,
  )
    ? reminder.customTimingOptions
    : [...reminder.customTimingOptions, storedOption];
  return {
    ...reminder,
    customTimingOptions,
    timingOptionIds: [option.id],
  };
}

export function applyWorkflowFollowupStartAfter(
  followUp: WorkflowFollowUpAutomationConfig,
  option: WorkflowFollowupStartAfterSelection,
): WorkflowFollowUpAutomationConfig {
  const customStartAfter = option.id.startsWith('customFollowupStartAfter:')
    ? {
        amount: option.amount,
        id: option.id,
        label: option.label,
        summaryLabel: option.summaryLabel,
        unit: option.unit,
      }
    : undefined;
  return {
    ...followUp,
    selections: { ...followUp.selections, startAfter: option.id },
    startAfterMinutes: option.startAfterMinutes,
    customStartAfter,
  };
}

export function applyWorkflowFollowupScheduleSelection(
  followUp: WorkflowFollowUpAutomationConfig,
  stepKey: 'interval' | 'maxAttempts',
  optionId: string,
): WorkflowFollowUpAutomationConfig {
  const invalidOption = () => {
    throw new Error(`Unknown follow-up schedule option: ${stepKey}.${optionId}`);
  };
  if (stepKey === 'interval') {
    const intervalHours = Number(optionId.match(/^interval(24|48|72|120|168)h$/)?.[1]);
    if (!Number.isInteger(intervalHours)) return invalidOption();
    return {
      ...followUp,
      selections: { ...followUp.selections, interval: optionId },
      intervalHours,
    };
  }
  const maxAttempts = Number(optionId.match(/^maxAttempts([1-9]|10)$/)?.[1]);
  if (!Number.isInteger(maxAttempts)) return invalidOption();
  return {
    ...followUp,
    selections: { ...followUp.selections, maxAttempts: optionId },
    maxAttempts,
  };
}

export function createInitialWorkflowAutomationConfigs(): WorkflowAutomationConfigs {
  return {
    reminder: {
      enabled: false,
      activationScope: 'futureOnly',
      revision: 0,
      selections: {
        maxAttempts: 'reminderCount1',
        timing: 'threeHoursBeforeAppointment',
        template: 'appointmentReminder',
      },
      timingOptionIds: ['threeHoursBeforeAppointment'],
      customTimingOptions: [],
    },
    followUp: {
      enabled: false,
      activationScope: 'futureOnly',
      revision: 0,
      selections: {
        audience: 'hotWarmLeads',
        schedule: 'followupSchedule',
        startAfter: 'startAfter24h',
        interval: 'interval24h',
        maxAttempts: 'maxAttempts3',
        template: 'noReplyFollowup',
      },
      audienceFilters: ['lead:Hot', 'lead:Warm'],
      startAfterMinutes: 1440,
      intervalHours: 24,
      maxAttempts: 3,
      messageStrategy: 'same',
      attemptTemplates: [],
    },
  };
}
