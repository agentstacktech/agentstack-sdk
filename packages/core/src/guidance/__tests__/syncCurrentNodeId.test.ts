import { describe, expect, it } from 'vitest';

import { compilePathPlan } from '../domain/compilePathPlan';
import { syncCurrentNodeId } from '../domain/syncCurrentNodeId';
import { initialPlaybookStateV2, runPathReducer } from '../engine/runPathReducer';
import type { Playbook } from '../types/playbookTypes';

const sellLikePb: Playbook = {
  id: 'sell-digital-content',
  version: 1,
  titleDefault: 'Sell digital',
  intentPatterns: [],
  intentKeywords: [],
  audienceMask: { dev: true, user: true },
  entryNodeId: 'q_project',
  executionRules: [{ when: { projectScope: 'new' }, steps: ['t_create'] }],
  nodes: {
    q_project: {
      kind: 'question',
      id: 'q_project',
      promptDefault: 'Which project?',
      input: 'single_choice',
      options: [
        { id: 'new', labelDefault: 'New', next: 'q_site', set: { projectScope: 'new' } },
      ],
    },
    q_site: {
      kind: 'question',
      id: 'q_site',
      promptDefault: 'How will customers reach you?',
      input: 'chips',
      options: [{ id: 'host', labelDefault: 'Host', next: 'outcome', set: { siteMode: 'host' } }],
    },
    t_create: {
      kind: 'task',
      id: 't_create',
      titleDefault: 'Create project',
      mscTaskId: 'project.new',
    },
    outcome: { kind: 'outcome', id: 'outcome', messageDefault: 'Done' },
  },
};

describe('syncCurrentNodeId G2', () => {
  it('keeps focus on discover question after branching answer', () => {
    let state = initialPlaybookStateV2('sell-digital-content', null, 'q_project');
    state = runPathReducer(sellLikePb, state, {
      type: 'ANSWER',
      nodeId: 'q_project',
      optionId: 'new',
    });
    expect(state.currentNodeId).toBe('q_site');
  });

  it('prefers open discover question when currentNodeId points at a task', () => {
    const state = {
      ...initialPlaybookStateV2('sell-digital-content', null, 'q_project'),
      answers: { projectScope: 'new' },
      completedNodeIds: ['q_project'],
      currentNodeId: 't_create',
    };
    const plan = compilePathPlan(sellLikePb, state);
    expect(syncCurrentNodeId(plan, state)).toBe('q_site');
  });
});
