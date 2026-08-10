import { describe, expect, it } from 'vitest';
import {
  getAgentTrainingLabel,
  getAgentTrainingStatus,
} from './agentIndexingStatus';

describe('agent indexing status', () => {
  it('uses the Test your agent training label for an actively running item', () => {
    const indexingStatus = { isIndexing: true, queued: 0, running: 1 };

    expect(getAgentTrainingStatus(false, indexingStatus)).toBe('indexing');
    expect(getAgentTrainingLabel(indexingStatus)).toBe('Training 1 item…');
  });

  it('uses the queue label while indexing work is waiting', () => {
    const indexingStatus = { isIndexing: true, queued: 2, running: 0 };

    expect(getAgentTrainingLabel(indexingStatus)).toBe('2 items in queue…');
  });

  it('keeps checking and ready states distinct', () => {
    expect(getAgentTrainingStatus(true, null)).toBe('loading');
    expect(getAgentTrainingStatus(false, { isIndexing: false, queued: 0, running: 0 })).toBe('ready');
  });
});
