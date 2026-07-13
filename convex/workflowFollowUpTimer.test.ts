import { describe, expect, test } from 'vitest';
import {
  isEligibleWorkflowFollowUpOutbound,
  matchesWorkflowFollowUpAudience,
  planWorkflowFollowUpOutbound,
} from './workflowFollowUpTimer';

describe('workflow follow-up timers', () => {
  test('accepts only successful one-to-one WhatsApp outbounds', () => {
    expect(isEligibleWorkflowFollowUpOutbound({
      service: 'whatsapp',
      direction: 'outgoing',
      status: 'sent',
      source: 'human',
      broadcast: false,
    })).toBe(true);
    expect(isEligibleWorkflowFollowUpOutbound({
      service: 'whatsapp',
      direction: 'outgoing',
      status: 'queued',
      source: 'human',
      broadcast: false,
    })).toBe(false);
    for (const source of ['workflowReminder', 'workflowFollowUp'] as const) {
      expect(isEligibleWorkflowFollowUpOutbound({
        service: 'whatsapp',
        direction: 'outgoing',
        status: 'sent',
        source,
        broadcast: false,
      })).toBe(false);
    }
  });

  test('matches configured lead temperatures or customer tags', () => {
    expect(matchesWorkflowFollowUpAudience({
      filters: ['lead:Hot', 'tag:vip'],
      leadTemperature: 'Warm',
      tags: ['vip'],
    })).toBe(true);
    expect(matchesWorkflowFollowUpAudience({
      filters: ['lead:Hot', 'tag:vip'],
      leadTemperature: 'Cold',
      tags: ['new'],
    })).toBe(false);
  });

  test('updates one logical timer without accumulating work', () => {
    expect(planWorkflowFollowUpOutbound({
      existingWorkId: 'work-1',
      latestOutboundAt: 2_000,
      startAfterMs: 1_000,
    })).toEqual({
      dueAt: 3_000,
      enqueue: false,
      workId: 'work-1',
    });
    expect(planWorkflowFollowUpOutbound({
      latestOutboundAt: 2_000,
      startAfterMs: 1_000,
    })).toEqual({
      dueAt: 3_000,
      enqueue: true,
      workId: undefined,
    });
  });
});
