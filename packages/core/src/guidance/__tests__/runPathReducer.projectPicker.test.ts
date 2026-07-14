import {
  getCurrentNode,
  initialPlaybookStateV2,
  isPlaybookQuestionPhase,
  runPathReducer,
} from '../engine/runPathReducer';
import type { Playbook } from '../types/playbookTypes';

const hostStaticPb: Playbook = {
  id: 'host-static-site',
  version: 1,
  titleDefault: 'Host a static site',
  intentPatterns: [],
  intentKeywords: [],
  audienceMask: { dev: true, user: true },
  entryNodeId: 'q_project',
  executionRules: [{ when: {}, steps: ['t_deploy'] }],
  nodes: {
    q_project: {
      kind: 'question',
      id: 'q_project',
      promptDefault: 'Use which project?',
      input: 'project_picker',
      options: [{ id: 'ok', labelDefault: 'Continue', next: 't_deploy' }],
    },
    t_deploy: {
      kind: 'capability',
      id: 't_deploy',
      titleDefault: 'Deploy',
      taskId: 'hosting.deploy_zip',
    },
    outcome: { kind: 'outcome', id: 'outcome', messageDefault: 'Done' },
  },
};

describe('runPathReducer SET_PROJECT', () => {
  it('completes project_picker question and focuses next step', () => {
    let state = initialPlaybookStateV2('host-static-site', null, 'q_project');
    expect(isPlaybookQuestionPhase(state, hostStaticPb)).toBe(true);

    state = runPathReducer(hostStaticPb, state, { type: 'SET_PROJECT', projectId: 9 });
    expect(state.projectId).toBe(9);
    expect(isPlaybookQuestionPhase(state, hostStaticPb)).toBe(false);
    expect(getCurrentNode(hostStaticPb, state)?.id).toBe('t_deploy');
  });
});
