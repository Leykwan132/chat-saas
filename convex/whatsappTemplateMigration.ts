import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import type { WhatsAppTemplateStatus } from './whatsappTemplateLifecycle';

type MigratableTemplate = {
  status: WhatsAppTemplateStatus;
  createdAt: number;
  statusUpdatedAt?: number;
};

const migrations = new Migrations<DataModel>(components.migrations);

export function getWhatsAppTemplateMigrationPatch(template: MigratableTemplate) {
  if (template.status === 'submitted') {
    return {
      status: 'in_review' as const,
      statusUpdatedAt: template.statusUpdatedAt ?? template.createdAt,
    };
  }
  if (template.statusUpdatedAt === undefined) {
    return { statusUpdatedAt: template.createdAt };
  }
  return undefined;
}

export const backfillWhatsAppTemplateLifecycle = migrations.define({
  table: 'whatsappTemplates',
  batchSize: 25,
  migrateOne: (_, template) => getWhatsAppTemplateMigrationPatch(template),
});

export const runBackfillWhatsAppTemplateLifecycle = migrations.runner(
  internal.whatsappTemplateMigration.backfillWhatsAppTemplateLifecycle,
);
