import type { Playbook } from '../types/playbookTypes';
import { initialPlaybookStateV2, runPathReducer } from '../engine/runPathReducer';

const miniPlaybook: Playbook = {
  id: 'messaging-channel-bot',
  version: 1,
  titleDefault: 'Test',
  intentKeywords: [],
  intentPatterns: [],
  audienceMask: { dev: true },
  entryNodeId: 'q_channel',
  executionRules: [{ when: {}, steps: ['t_quick_start', 't_attach'] }],
  nodes: {
    q_channel: {
      kind: 'question',
      id: 'q_channel',
      promptDefault: 'Channel?',
      input: 'chips',
      options: [
        { id: 'ch_telegram', labelDefault: 'Telegram', next: 't_quick_start', set: { channel: 'telegram' } },
      ],
    },
    t_quick_start: {
      kind: 'capability',
      id: 't_quick_start',
      titleDefault: 'Create bot',
      taskId: 'bots.quick_start',
      surface: 'inline',
    },
    t_attach: {
      kind: 'capability',
      id: 't_attach',
      titleDefault: 'Attach',
      taskId: 'bots.attach_channel',
      surface: 'inline',
    },
    outcome: { kind: 'outcome', id: 'outcome', messageDefault: 'Done' },
  },
};

describe('runPathReducer TASK_COMPLETE artifact', () => {
  it('merges artifact into answers for downstream steps', () => {
    let state = initialPlaybookStateV2('messaging-channel-bot', 1, miniPlaybook.entryNodeId);
    state = runPathReducer(
      miniPlaybook,
      state,
      { type: 'ANSWER', nodeId: 'q_channel', optionId: 'ch_telegram' },
      {},
    );
    state = runPathReducer(
      miniPlaybook,
      state,
      {
        type: 'TASK_COMPLETE',
        nodeId: 't_quick_start',
        artifact: { botId: 'bot-uuid-1', channel: 'telegram' },
      },
      {},
    );

    expect(state.answers.botId).toBe('bot-uuid-1');
    expect(state.answers.channel).toBe('telegram');
    expect(state.stepProgress.t_quick_start?.artifact).toEqual({
      botId: 'bot-uuid-1',
      channel: 'telegram',
    });
    expect(state.currentNodeId).toBe('t_attach');
  });
});
