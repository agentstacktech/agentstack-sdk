import { describe, expect, it } from 'vitest';

import { LocalPathStore } from '../LocalPathStore';
import { normalizePathSessionIndex } from '../normalizePathSessionIndex';

describe('normalizePathSessionIndex', () => {
  it('returns empty sessions for nullish or malformed payloads', () => {
    expect(normalizePathSessionIndex(null)).toEqual({
      activePlaybookId: null,
      sessions: [],
    });
    expect(normalizePathSessionIndex({ activePlaybookId: 'host-static-site' })).toEqual({
      activePlaybookId: 'host-static-site',
      sessions: [],
    });
    expect(normalizePathSessionIndex({ sessions: 'bad' })).toEqual({
      activePlaybookId: null,
      sessions: [],
    });
  });

  it('filters invalid session rows', () => {
    const normalized = normalizePathSessionIndex({
      activePlaybookId: 'host-static-site',
      sessions: [
        {
          playbookId: 'host-static-site',
          percent: 40,
          currentStepId: 's1',
          title: 'Publish',
          updatedAt: '2026-08-09T00:00:00.000Z',
        },
        { playbookId: 'broken' },
      ],
    });
    expect(normalized.sessions).toHaveLength(1);
    expect(normalized.sessions[0]?.playbookId).toBe('host-static-site');
  });
});

describe('LocalPathStore.loadSessionIndex', () => {
  it('coerces corrupted index JSON without sessions array', () => {
    const storage = new Map<string, string>();
    const store = new LocalPathStore({
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => {
        storage.set(k, v);
      },
      removeItem: (k) => {
        storage.delete(k);
      },
    });
    storage.set(
      'agentstack.compass.path.v2.1.index',
      JSON.stringify({ activePlaybookId: 'host-static-site' }),
    );
    expect(store.loadSessionIndex('1')).toEqual({
      activePlaybookId: 'host-static-site',
      sessions: [],
    });
  });
});
