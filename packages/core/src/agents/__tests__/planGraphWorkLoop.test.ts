import {
  parsePlanExecuteResult,
  primaryRecoveryNextAction,
  primaryWorkGraphAction,
} from '../planGraph';

describe('parsePlanExecuteResult', () => {
  it('normalizes focus node and handoff ladder', () => {
    const result = parsePlanExecuteResult(
      {
        run: { status: 'completed' },
        work_state: 'executable',
        next_action: { action: 'agents.work_next', params: { project_id: 1 } },
      },
      { success: true, focusNodeId: 'leaf-1' },
    );
    expect(result.success).toBe(true);
    expect(result.focus_node_id).toBe('leaf-1');
    expect(result.work_state).toBe('executable');
    expect(result.next_action?.action).toBe('agents.work_next');
  });

  it('surfaces autonomous claim gate error_code', () => {
    const result = parsePlanExecuteResult(
      {
        node_id: 'leaf-2',
        status: 'ready',
        hint: 'autonomous_mode requires in_progress claim',
      },
      { success: false, errorCode: 'plan_claim_required' },
    );
    expect(result.success).toBe(false);
    expect(result.error_code).toBe('plan_claim_required');
    expect(result.node_id).toBe('leaf-2');
  });
});

describe('primaryWorkGraphAction', () => {
  it('prefers canonical next_action over next_actions[0]', () => {
    const action = primaryWorkGraphAction({
      next_action: { action: 'agents.plan_claim', params: { project_id: 1 } },
      next_actions: [{ action: 'agents.work_next', params: { project_id: 1 } }],
    });
    expect(action?.action).toBe('agents.plan_claim');
  });

  it('preserves choose_template resolution on next_actions[0]', () => {
    const action = primaryWorkGraphAction({
      next_actions: [
        {
          action: 'agents.create_from_template',
          params: { project_id: 1 },
          resolution: {
            mode: 'choose_template',
            candidates: [{ template_id: 'analyst@v1', score: 0.7 }],
          },
        },
      ],
    });
    expect(action?.resolution?.mode).toBe('choose_template');
    expect(action?.resolution?.candidates?.[0]?.template_id).toBe('analyst@v1');
  });
});

describe('primaryRecoveryNextAction', () => {
  it('prefers choose_template row over stripped canonical', () => {
    const action = primaryRecoveryNextAction({
      next_action: { action: 'agents.create_from_template', params: { project_id: 1 } },
      next_actions: [
        {
          action: 'agents.create_from_template',
          params: { project_id: 1 },
          resolution: {
            mode: 'choose_template',
            candidates: [{ template_id: 'analyst@v1' }],
          },
        },
      ],
    });
    expect(action?.resolution?.candidates?.[0]?.template_id).toBe('analyst@v1');
  });
});
