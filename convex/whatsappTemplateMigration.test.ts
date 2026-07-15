import { describe, expect, test } from 'vitest';
import { getWhatsAppTemplateMigrationPatch } from './whatsappTemplateMigration';

describe('WhatsApp template lifecycle migration', () => {
  test('moves submitted records to in review', () => {
    expect(getWhatsAppTemplateMigrationPatch({
      status: 'submitted',
      createdAt: 100,
      statusUpdatedAt: undefined,
    })).toEqual({ status: 'in_review', statusUpdatedAt: 100 });
  });

  test('adds a missing status timestamp without changing the status', () => {
    expect(getWhatsAppTemplateMigrationPatch({
      status: 'failed',
      createdAt: 100,
      statusUpdatedAt: undefined,
    })).toEqual({ statusUpdatedAt: 100 });
  });

  test('does not rewrite an already migrated record', () => {
    expect(getWhatsAppTemplateMigrationPatch({
      status: 'approved',
      createdAt: 100,
      statusUpdatedAt: 200,
    })).toBeUndefined();
  });
});
