import {
  buildGraphViewerModel,
  canClaimFromWorkNext,
  isWorkNextActionableState,
  followWorkGraphAction,
  parseWorkNextExecution,
  parseWorkNextPacket,
  recoveryNodeIdForBlockedWork,
  runWorkGraphLoop,
} from '../planGraph';

describe('parseWorkNextPacket', () => {
  it('normalizes suggested_agent_id on executable next_work', () => {
    const packet = parseWorkNextPacket({
      state: 'executable',
      next_work: {
        node_id: 'leaf',
        suggested_agent_id: '  test-fleet-agent  ',
      },
    });
    expect(packet.next_work?.suggested_agent_id).toBe('test-fleet-agent');
  });

  it('parses execution block from harness-shaped next_work', () => {
    const raw = {
      state: 'blocked',
      goal: { id: 'g1', title: 'Goal' },
      blocked_work: [
        {
          node_id: 'a1',
          blocked_reason: 'no_compatible_agent',
          execution: {
            node_id: 'a1',
            execution_ready: false,
            fully_provisionable: true,
            partially_provisionable: false,
            compatible_templates: [{ template_id: 'analyst@v1', score: 0.9 }],
            conditions: [{ type: 'ExecutorAvailable', status: 'False', reason: 'NoCompatibleAgent' }],
          },
        },
      ],
      next_actions: [{ action: 'agents.plan_recovery_scan', params: { project_id: 1 } }],
    };
    const packet = parseWorkNextPacket(raw);
    expect(packet.state).toBe('blocked');
    expect(packet.blocked_work?.[0]?.blocked_reason).toBe('no_compatible_agent');
    const exec = packet.blocked_work?.[0]?.execution ?? parseWorkNextExecution(packet.blocked_work?.[0]);
    expect(exec?.fully_provisionable).toBe(true);
    expect(exec?.compatible_templates?.[0]?.template_id).toBe('analyst@v1');
  });

  it('parses specialization handoff fields from execution', () => {
    const exec = parseWorkNextExecution({
      node_id: 'n1',
      next_transition: 'handoff',
      specialization_id: 'backend_engineer',
      blocked_reason: 'specialization_mismatch',
    });
    expect(exec?.next_transition).toBe('handoff');
    expect(exec?.specialization_id).toBe('backend_engineer');
  });

  it('promotes handoff from blocked_work rows', () => {
    const packet = parseWorkNextPacket({
      blocked_work: [
        {
          node_id: 'n3',
          blocked_reason: 'specialization_mismatch',
          execution: {
            next_transition: 'handoff',
            specialization_id: 'planner',
          },
        },
      ],
    });
    expect(packet.blocked_work?.[0]?.handoff?.next_transition).toBe('handoff');
    expect(packet.blocked_work?.[0]?.handoff?.required_specialization_id).toBe('planner');
  });

  it('parses execution_summary and template match_provenance', () => {
    const exec = parseWorkNextExecution({
      node_id: 'n-summary',
      execution_summary: {
        missing_specializations: ['backend_engineer'],
        provisionable_specializations: ['qa_engineer'],
      },
      compatible_templates: [
        {
          template_id: 'backend_engineer@v1',
          score: 0.9,
          match_provenance: {
            exact_specialization: true,
            template_id: 'backend_engineer@v1',
          },
        },
      ],
    });
    expect(exec?.execution_summary?.missing_specializations).toEqual(['backend_engineer']);
    expect(exec?.compatible_templates?.[0]?.match_provenance?.exact_specialization).toBe(true);
  });

  it('parses agent_eligible and derived_specialization on execution', () => {
    const exec = parseWorkNextExecution({
      node_id: 'n4',
      agent_eligible: false,
      derived_specialization: true,
      specialization_id: 'planner',
    });
    expect(exec?.agent_eligible).toBe(false);
    expect(exec?.derived_specialization).toBe(true);
    expect(exec?.specialization_id).toBe('planner');
  });

  it('enriches blocked rows with nested execution via parseWorkNextPacket', () => {
    const packet = parseWorkNextPacket({
      blocked_work: [
        {
          node_id: 'n2',
          blocked_reason: 'provision_required',
          execution: {
            executable_after_provision: true,
            compatible_templates: [{ template_id: 'backend_engineer@v1', score: 0.88 }],
          },
        },
      ],
    });
    expect(packet.blocked_work?.[0]?.execution?.executable_after_provision).toBe(true);
    expect(packet.blocked_work?.[0]?.compatible_templates?.[0]?.template_id).toBe(
      'backend_engineer@v1',
    );
  });

  it('falls back to recovery.next_actions when top-level next_actions absent', () => {
    const packet = parseWorkNextPacket({
      state: 'blocked',
      recovery: {
        next_actions: [{ action: 'agents.plan_reclaim_stale', params: { project_id: 1730 } }],
      },
    });
    expect(packet.next_actions?.[0]?.action).toBe('agents.plan_reclaim_stale');
  });

  it('XXI-19: parses diagnostics.harness_state from blocked work_next packet', () => {
    const packet = parseWorkNextPacket({
      state: 'blocked',
      blocked_work: [
        {
          node_id: 'blocked-1',
          blocked_reason: 'no_compatible_agent',
        },
      ],
      diagnostics: {
        harness_state: {
          node_id: 'blocked-1',
          work_lifecycle: 'blocked',
          dependency_ready: true,
          execution_ready: false,
          executor_state: 'provision_required',
          claim_state: 'blocked',
          blocked_reason: 'no_compatible_agent',
          provisionable: true,
        },
      },
    });
    const hs = packet.diagnostics?.harness_state;
    expect(hs?.node_id).toBe('blocked-1');
    expect(hs?.work_lifecycle).toBe('blocked');
    expect(hs?.dependency_ready).toBe(true);
    expect(hs?.execution_ready).toBe(false);
    expect(hs?.executor_state).toBe('provision_required');
    expect(hs?.claim_state).toBe('blocked');
    expect(hs?.blocked_reason).toBe('no_compatible_agent');
    expect(hs?.provisionable).toBe(true);
  });

  it('keeps diagnostics.bottleneck and goal_progress.weighted_completion_percent', () => {
    const packet = parseWorkNextPacket({
      state: 'actionable',
      goal_summary: {
        current_bottleneck: { id: 'n1', title: 'Ship' },
        goal_progress: { weighted_completion_percent: 42.5, completion_percent: 40 },
      },
      diagnostics: {
        harness_state: { node_id: 'n1', work_lifecycle: 'blocked' },
        bottleneck: { node_id: 'n1', reason: 'dependency_blocked' },
      },
    });
    expect(packet.state).toBe('actionable');
    expect(packet.goal_summary?.current_bottleneck).toEqual({ id: 'n1', title: 'Ship' });
    expect(packet.goal_summary?.goal_progress?.weighted_completion_percent).toBe(42.5);
    expect(packet.diagnostics?.harness_state?.node_id).toBe('n1');
    expect(packet.diagnostics?.bottleneck).toEqual({
      node_id: 'n1',
      reason: 'dependency_blocked',
    });
  });
});

describe('graph viewer metrics', () => {
  it('adds bottleneck and weighted_completion_percent onto plan_summary metrics', () => {
    const model = buildGraphViewerModel(
      { tasks: [] },
      {
        state: 'actionable',
        plan_summary: { execution_ready_leaves: 2 },
        goal_summary: {
          current_bottleneck: { id: 'n1', title: 'Ship' },
          goal_progress: { weighted_completion_percent: 10 },
        },
        diagnostics: { bottleneck: { node_id: 'n1', reason: 'waiting' } },
      },
    );
    expect(model.metrics.execution_ready_leaves).toBe(2);
    expect(model.metrics.weighted_completion_percent).toBe(10);
    expect(model.metrics.bottleneck).toEqual({ node_id: 'n1', reason: 'waiting' });
  });

  it('falls back to goal_summary.current_bottleneck when diagnostics omit bottleneck', () => {
    const model = buildGraphViewerModel(
      { tasks: [] },
      {
        plan_summary: { execution_ready_leaves: 1 },
        goal_summary: {
          current_bottleneck: { id: 'leaf', title: 'Unblock' },
          goal_progress: { weighted_completion_percent: 0 },
        },
      },
    );
    expect(model.metrics.bottleneck).toEqual({ id: 'leaf', title: 'Unblock' });
    expect(model.metrics.weighted_completion_percent).toBe(0);
  });
});

describe('work graph goal scope', () => {
  const fleet = () => {
    const workNext = jest.fn().mockResolvedValue({ state: 'idle' });
    return {
      workNext,
      workStatus: jest.fn().mockResolvedValue({ state: 'actionable' }),
      claimPlanNodes: jest.fn().mockResolvedValue({}),
      planExecute: jest.fn().mockResolvedValue({}),
      ensureAgent: jest.fn().mockResolvedValue({}),
      planRecoveryScan: jest.fn().mockResolvedValue({}),
      planPropose: jest.fn().mockResolvedValue({}),
      planApplyProposal: jest.fn().mockResolvedValue({}),
      reclaimStalePlanClaims: jest.fn().mockResolvedValue({}),
      createFromTemplate: jest.fn().mockResolvedValue({}),
      planGet: jest.fn().mockResolvedValue({}),
      teamCreate: jest.fn().mockResolvedValue({}),
    };
  };

  it('merges loop goalId into workNext refresh when action params omit goal_id', async () => {
    const api = fleet();
    await followWorkGraphAction(
      api,
      7,
      { action: 'agents.plan_claim', params: { agent_id: 'a', node_id: 'n1' } },
      'goal-9',
    );
    expect(api.claimPlanNodes).toHaveBeenCalled();
    expect(api.workNext).toHaveBeenCalledWith(7, { goal_id: 'goal-9' });
  });

  it('keeps an action goal_id ahead of the loop goalId', async () => {
    const api = fleet();
    await followWorkGraphAction(
      api,
      7,
      { action: 'agents.plan_execute', params: { node_id: 'n1', goal_id: 'from-action' } },
      'from-loop',
    );
    expect(api.workNext).toHaveBeenCalledWith(7, { goal_id: 'from-action' });
  });

  it('dispatches plan_reclaim_stale then refreshes work_next', async () => {
    const api = fleet();
    await followWorkGraphAction(api, 9, { action: 'agents.plan_reclaim_stale', params: {} });
    expect(api.reclaimStalePlanClaims).toHaveBeenCalledWith(9, undefined);
    expect(api.workNext).toHaveBeenCalledWith(9);
  });

  it('returns claim next_action without a second work_next score', async () => {
    const api = fleet();
    api.claimPlanNodes.mockResolvedValue({
      next_action: { action: 'agents.plan_execute', params: { node_id: 'n1' } },
      state: 'actionable',
    });
    const packet = await followWorkGraphAction(api, 9, {
      action: 'agents.plan_claim',
      params: { agent_id: 'a', node_ids: ['n1'] },
    });
    expect(packet.next_action?.action).toBe('agents.plan_execute');
    expect(api.workNext).not.toHaveBeenCalled();
  });

  it('routes plan_claim_required back to agents.plan_claim', async () => {
    const api = fleet();
    const err = new Error('plan_claim_required') as Error & { error_code?: string };
    err.error_code = 'plan_claim_required';
    api.planExecute.mockRejectedValue(err);
    const packet = await followWorkGraphAction(api, 9, {
      action: 'agents.plan_execute',
      params: { node_id: 'n1', agent_id: 'a1' },
    });
    expect(packet.next_action?.action).toBe('agents.plan_claim');
    expect(packet.next_action?.params).toMatchObject({ node_id: 'n1', agent_id: 'a1' });
    expect(api.workNext).not.toHaveBeenCalled();
  });

  it('stops the loop when plan_completion_blocked has no follow-up action', async () => {
    const api = fleet();
    const err = new Error('plan_completion_blocked') as Error & { error_code?: string };
    err.error_code = 'plan_completion_blocked';
    api.workNext.mockResolvedValue({
      state: 'actionable',
      node_id: 'n1',
      revision: 3,
      next_action: { action: 'agents.plan_execute', params: { node_id: 'n1' } },
    });
    api.planExecute.mockRejectedValue(err);
    const packet = await runWorkGraphLoop(api, 3, { maxIterations: 5 });
    expect(packet.state).toBe('blocked');
    expect(packet.reason).toBe('plan_completion_blocked');
    expect(api.planExecute).toHaveBeenCalledTimes(1);
  });

  it('dispatches plan_propose with node_id then refreshes work_next', async () => {
    const api = fleet();
    await followWorkGraphAction(api, 9, {
      action: 'agents.plan_propose',
      params: { node_id: 'n1', mode: 'repair_plan', goal_text: 'Repair' },
    });
    expect(api.planPropose).toHaveBeenCalledWith(9, {
      mode: 'repair_plan',
      node_id: 'n1',
      goal_text: 'Repair',
      routed_goal: undefined,
    });
    expect(api.workNext).toHaveBeenCalled();
  });

  it('forwards plan_propose result to onPropose before refresh', async () => {
    const api = fleet();
    const proposed = { success: true, validation: { ok: true } };
    api.planPropose.mockResolvedValue(proposed);
    const onPropose = jest.fn();
    await followWorkGraphAction(
      api,
      9,
      { action: 'agents.plan_propose', params: { node_id: 'n1' } },
      undefined,
      undefined,
      { onPropose },
    );
    expect(onPropose).toHaveBeenCalledWith(proposed);
  });

  it('dispatches create_from_template then refreshes work_next', async () => {
    const api = fleet();
    await followWorkGraphAction(api, 9, {
      action: 'agents.create_from_template',
      params: { template_id: 'analyst@v1', node_id: 'leaf-1' },
    });
    expect(api.createFromTemplate).toHaveBeenCalledWith(9, {
      template_id: 'analyst@v1',
      name: undefined,
      description: undefined,
      node_id: 'leaf-1',
      template_input: undefined,
    });
    expect(api.workNext).toHaveBeenCalled();
  });

  it('runWorkGraphLoop follows recovery when plan_claim is blocked', async () => {
    const api = fleet();
    api.workNext
      .mockResolvedValueOnce({
        state: 'actionable',
        next_action: { action: 'agents.plan_claim', params: { node_ids: ['n1'] } },
        next_work: {
          node_id: 'n1',
          action_readiness: { can_claim: false, blocked_reason: 'wip_full' },
        },
        recovery: {
          next_actions: [{ action: 'agents.plan_get', params: { project_id: 3 } }],
        },
      })
      .mockResolvedValueOnce({ state: 'idle' });
    api.planGet = jest.fn().mockResolvedValue({});
    await runWorkGraphLoop(api, 3, { maxIterations: 3 });
    expect(api.planGet).toHaveBeenCalled();
    expect(api.claimPlanNodes).not.toHaveBeenCalled();
  });

  it('forwards bulk claim limit without empty node_ids', async () => {
    const api = fleet();
    await followWorkGraphAction(api, 9, {
      action: 'agents.plan_claim',
      params: { agent_id: 'a1', limit: 3 },
    });
    expect(api.claimPlanNodes).toHaveBeenCalledWith(9, { agent_id: 'a1', limit: 3 });
  });

  it('sends goal_id on every runWorkGraphLoop workNext refresh', async () => {
    const api = fleet();
    api.workNext
      .mockResolvedValueOnce({
        state: 'executable',
        next_action: { action: 'agents.plan_execute', params: { node_id: 'n1' } },
      })
      .mockResolvedValueOnce({ state: 'idle' });
    await runWorkGraphLoop(api, 3, { goalId: 'g-1', maxIterations: 3 });
    expect(api.workNext).toHaveBeenNthCalledWith(1, 3, { goal_id: 'g-1' });
    expect(api.planExecute).toHaveBeenCalledWith(3, {
      node_id: 'n1',
      agent_id: undefined,
      goal_text: undefined,
      mode: undefined,
    });
    expect(api.workNext).toHaveBeenNthCalledWith(2, 3, { goal_id: 'g-1' });
  });
});

describe('isWorkNextActionableState', () => {
  it('treats executable as the actionable alias', () => {
    expect(isWorkNextActionableState('actionable')).toBe(true);
    expect(isWorkNextActionableState('executable')).toBe(true);
    expect(isWorkNextActionableState('blocked')).toBe(false);
  });
});

describe('parseWorkNextPacket state alias', () => {
  it('rewrites executable to actionable', () => {
    expect(parseWorkNextPacket({ state: 'executable', node_id: 'n1' }).state).toBe('actionable');
  });
});

describe('canClaimFromWorkNext', () => {
  it('allows claim when action_readiness absent', () => {
    expect(canClaimFromWorkNext({ state: 'executable', claim: { available: true } })).toBe(true);
  });

  it('hoists compact top-level action_readiness into next_work', () => {
    const packet = parseWorkNextPacket({
      detail: 'compact',
      state: 'actionable',
      node_id: 'n1',
      action_readiness: { can_claim: false, blocked_reason: 'rbac_denied' },
    });
    expect(canClaimFromWorkNext(packet)).toBe(false);
  });

  it('blocks claim when can_claim is false', () => {
    expect(
      canClaimFromWorkNext({
        state: 'executable',
        claim: { available: true },
        next_work: { action_readiness: { can_claim: false, blocked_reason: 'rbac_denied' } },
      }),
    ).toBe(false);
  });
});

describe('recoveryNodeIdForBlockedWork', () => {
  it('prefers recovery.target_node_id', () => {
    const id = recoveryNodeIdForBlockedWork(
      [{ node_id: 'a' }],
      { target_node_id: 'target-1' },
    );
    expect(id).toBe('target-1');
  });

  it('falls back to first fully_provisionable row', () => {
    const id = recoveryNodeIdForBlockedWork([
      { node_id: 'blocked', execution: { fully_provisionable: false } },
      { node_id: 'prov', execution: { fully_provisionable: true } },
    ]);
    expect(id).toBe('prov');
  });

  it('prefers handoff row before provisionable', () => {
    const id = recoveryNodeIdForBlockedWork([
      { node_id: 'prov', execution: { fully_provisionable: true } },
      { node_id: 'handoff', blocked_reason: 'role_mismatch' },
    ]);
    expect(id).toBe('handoff');
  });
});
