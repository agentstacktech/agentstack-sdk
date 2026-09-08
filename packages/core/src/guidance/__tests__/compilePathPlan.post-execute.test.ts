import { describe, expect, it } from 'vitest';

import { compilePathPlan, initialPlaybookStateV2 } from '../index';
import type { Playbook } from '../types/playbookTypes';

const postExecuteFixture: Playbook = {
  id: 'crm-first',
  version: 1,
  titleDefault: 'Post-execute fixture',
  intentPatterns: [],
  intentKeywords: [],
  audienceMask: { dev: true, user: true },
  entryNodeId: 't_a',
  executionRules: [
    { when: {}, steps: ['t_a', 'v_a'] },
    { when: { branch: 'yes' }, steps: ['t_b'] },
  ],
  nodes: {
    t_a: {
      kind: 'capability',
      id: 't_a',
      titleDefault: 'Step A',
      taskId: 'demo.a',
      surface: 'inline',
    },
    v_a: {
      kind: 'verify',
      id: 'v_a',
      titleDefault: 'Verify A',
      verify: { kind: 'manualConfirm', checklistKeys: ['a'] },
    },
    q_branch: {
      kind: 'question',
      id: 'q_branch',
      phase: 'post_execute',
      afterNodeId: 'v_a',
      promptDefault: 'Continue to B?',
      input: 'chips',
      options: [
        { id: 'yes', labelDefault: 'Yes', next: 't_b', set: { branch: 'yes' } },
        { id: 'no', labelDefault: 'No', next: 'outcome', set: { branch: 'no' } },
      ],
    },
    t_b: {
      kind: 'capability',
      id: 't_b',
      titleDefault: 'Step B',
      taskId: 'demo.b',
      surface: 'inline',
    },
    outcome: {
      kind: 'outcome',
      id: 'outcome',
      messageDefault: 'Done',
    },
  },
};

describe('compilePathPlan post-execute questions', () => {
  it('inserts question after anchor verify without showing conditional step', () => {
    const state = initialPlaybookStateV2('crm-first', 1, 't_a');
    const plan = compilePathPlan(postExecuteFixture, state);
    const ids = plan.steps.map((s) => s.nodeId);
    expect(ids.indexOf('v_a')).toBeLessThan(ids.indexOf('q_branch'));
    expect(ids).not.toContain('t_b');
  });

  it('includes conditional step after post-execute answer', () => {
    const state = {
      ...initialPlaybookStateV2('crm-first', 1, 't_b'),
      completedNodeIds: ['t_a', 'v_a', 'q_branch'],
      answers: { branch: 'yes' },
    };
    const plan = compilePathPlan(postExecuteFixture, state);
    expect(plan.steps.map((s) => s.nodeId)).toContain('t_b');
  });
});
