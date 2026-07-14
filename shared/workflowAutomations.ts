export type WorkflowAutomationActivationScope = 'currentAndFuture' | 'futureOnly';

export type WorkflowWhatsappTemplateComponent = {
  type: string;
  format?: string;
  text?: string;
  r2Key?: string;
  example?: {
    body_text_named_params: Array<{
      param_name: string;
      example: string;
    }>;
  };
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

export type WorkflowFollowUpAutomationConfig = {
  enabled: boolean;
  activationScope?: WorkflowAutomationActivationScope;
  revision: number;
  selections: Record<string, string>;
  audienceFilters: string[];
  startAfterHours: number;
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
      startAfterHours: 24,
      intervalHours: 24,
      maxAttempts: 3,
      messageStrategy: 'same',
      attemptTemplates: [],
    },
  };
}
