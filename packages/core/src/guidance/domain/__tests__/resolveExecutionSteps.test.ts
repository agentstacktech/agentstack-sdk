/**
 * Tests for resolveExecutionStepsLegacy — WCP recipe compile (G-01).
 */
import { describe, expect, it } from 'vitest';

import { resolveExecutionStepsLegacy } from '../resolveExecutionSteps';
import type { Playbook, PlaybookStateV2 } from '../../types/playbookTypes';

const emptyState: PlaybookStateV2 = {
  answers: {},
  completedNodeIds: [],
  currentNodeId: 'cap_context',
};

describe('resolveExecutionStepsLegacy', () => {
  it('honors defaultExecutionSteps including recipe nodes (fabric-demo)', () => {
    const playbook = {
      id: 'fabric-demo',
      version: 1,
      titleDefault: 'Try Fabric',
      intentPatterns: [],
      intentKeywords: [],
      audienceMask: { dev: true, user: true },
      entryNodeId: 'cap_context',
      defaultExecutionSteps: ['cap_context', 'recipe_run', 'cap_connections'],
      nodes: {
        cap_context: {
          kind: 'capability',
          id: 'cap_context',
          titleDefault: 'Context',
          fabricCapabilityId: 'context.get',
        },
        recipe_run: {
          kind: 'recipe',
          id: 'recipe_run',
          recipeId: 'fabric.plg_ask',
          titleDefault: 'Run recipe',
        },
        cap_connections: {
          kind: 'capability',
          id: 'cap_connections',
          titleDefault: 'Connections',
          fabricCapabilityId: 'integrations.list_connections',
        },
        orphan_task: {
          kind: 'task',
          id: 'orphan_task',
          titleDefault: 'Orphan',
          mscTaskId: 'fabric.hub.open',
        },
      },
    } as unknown as Playbook;

    const ids = resolveExecutionStepsLegacy(playbook, emptyState);
    expect(ids).toEqual(['cap_context', 'recipe_run', 'cap_connections']);
    expect(ids).not.toContain('orphan_task');
  });

  it('includes recipe kind when no defaultExecutionSteps', () => {
    const playbook = {
      id: 'other',
      version: 1,
      titleDefault: 'Other',
      intentPatterns: [],
      intentKeywords: [],
      audienceMask: { dev: true, user: true },
      entryNodeId: 'r1',
      nodes: {
        r1: { kind: 'recipe', id: 'r1', recipeId: 'fabric.plg_ask', titleDefault: 'R' },
        t1: { kind: 'task', id: 't1', titleDefault: 'T', mscTaskId: 'x' },
      },
    } as unknown as Playbook;

    const ids = resolveExecutionStepsLegacy(playbook, emptyState);
    expect(ids).toContain('r1');
    expect(ids).toContain('t1');
  });
});
