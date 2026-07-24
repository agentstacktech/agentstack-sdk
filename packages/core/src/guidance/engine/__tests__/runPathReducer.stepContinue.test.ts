/**
 * Unit coverage for STEP_CONTINUE / awaitingContinue (`sdk.guidance.gen1`).
 */
import { describe, expect, it } from 'vitest';
import {
  compilePathPlan,
  initialPlaybookStateV2,
  runPathReducer,
  type Playbook,
} from '../../index';

const miniPlaybook: Playbook = {
  id: 'storage-upload',
  version: 1,
  titleDefault: 'Upload',
  intentPatterns: ['upload'],
  intentKeywords: ['upload'],
  audienceMask: { dev: true, user: true },
  entryNodeId: 't_upload',
  autoAdvance: false,
  executionRules: [{ when: {}, steps: ['t_upload', 'v_files'] }],
  nodes: {
    t_upload: {
      kind: 'capability',
      id: 't_upload',
      titleDefault: 'Upload files',
      taskId: 'storage.upload',
    },
    v_files: {
      kind: 'verify',
      id: 'v_files',
      titleDefault: 'Verify',
      verify: { kind: 'storageFileExists', minCount: 1 },
    },
    outcome: {
      kind: 'outcome',
      id: 'outcome',
      messageDefault: 'Done',
    },
  },
};

describe('runPathReducer STEP_CONTINUE', () => {
  it('keeps cursor on completed step until STEP_CONTINUE when autoAdvance is false', () => {
    let state = initialPlaybookStateV2('storage-upload', 1, 't_upload');
    state = runPathReducer(miniPlaybook, state, {
      type: 'TASK_COMPLETE',
      nodeId: 't_upload',
      artifact: { count: 1 },
    });
    expect(state.stepProgress.t_upload?.status).toBe('done');
    expect(state.stepProgress.t_upload?.awaitingContinue).toBe(true);
    expect(state.currentNodeId).toBe('t_upload');

    state = runPathReducer(miniPlaybook, state, { type: 'STEP_CONTINUE' });
    expect(state.stepProgress.t_upload?.awaitingContinue).toBe(false);
    const plan = compilePathPlan(miniPlaybook, state);
    expect(plan.steps.some((s) => s.nodeId === state.currentNodeId)).toBe(true);
  });

  it('auto-advances when playbook.autoAdvance is true', () => {
    const autoPb = { ...miniPlaybook, autoAdvance: true };
    let state = initialPlaybookStateV2('storage-upload', 1, 't_upload');
    state = runPathReducer(autoPb, state, {
      type: 'TASK_COMPLETE',
      nodeId: 't_upload',
      artifact: { count: 1 },
    });
    expect(state.stepProgress.t_upload?.awaitingContinue).toBe(false);
    expect(state.currentNodeId).not.toBe('t_upload');
  });
});
