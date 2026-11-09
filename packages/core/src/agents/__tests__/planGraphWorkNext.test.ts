import {
  buildGraphViewerModel,
  parseOrchestrateRunResponse,
  normalizeMcpToolEnvelope,
  parallelSiblingLanes,
  canClaimFromWorkNext,
  claimRevisionFromPacket,
  isWorkNextActionableState,
  ensureAgentSaga,
  followWorkGraphAction,
  parseWorkNextExecution,
  parseWorkNextPacket,
  parseWorkNextFromMcpExecute,
  workGraphErrorToPacket,
  primaryWorkGraphAction,
  recoveryNodeIdForBlockedWork,
  runWorkGraphLoop,
  clampPlanGetDispatchDetail,
} from '../planGraph';

describe('clampPlanGetDispatchDetail', () => {
  it('downgrades body without node scope to cards', () => {
    expect(clampPlanGetDispatchDetail({ detail: 'body' })).toEqual({ detail: 'cards' });
  });

  it('keeps body when node_id is set', () => {
    expect(clampPlanGetDispatchDetail({ detail: 'body', node_id: 'n1' })).toEqual({
      detail: 'body',
      node_id: 'n1',
    });
  });
});

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

  it('keeps recovery.next_actions out of top-level next_actions list', () => {
    const packet = parseWorkNextPacket({
      state: 'blocked',
      recovery: {
        next_actions: [{ action: 'agents.plan_reclaim_stale', params: { project_id: 1730 } }],
      },
    });
    expect(packet.next_actions).toBeUndefined();
    expect(primaryWorkGraphAction(packet)?.action).toBe('agents.plan_reclaim_stale');
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

describe('parallelSiblingLanes', () => {
  it('groups parallelizable siblings under the same parent', () => {
    const lanes = parallelSiblingLanes([
      { id: 'a', parent_id: 'root', parallelizable: true },
      { id: 'b', parent_id: 'root', parallelizable: true },
      { id: 'c', parent_id: 'root', parallelizable: false },
    ]);
    expect(lanes).toEqual([['a', 'b']]);
  });
});

describe('parseWorkNextPacket MCP envelope', () => {
  it('reads compact work_next from structuredContent.data', () => {
    const packet = parseWorkNextPacket({
      success: true,
      structuredContent: {
        data: {
          detail: 'compact',
          state: 'executable',
          node_id: 'n-1',
          project_id: 1,
        },
      },
    });
    expect(packet.state).toBe('actionable');
    expect(packet.node_id).toBe('n-1');
    expect(packet.project_id).toBe(1);
  });
});

describe('normalizeMcpToolEnvelope', () => {
  it('uses run_succeeded and structuredContent.data.steps', () => {
    const env = normalizeMcpToolEnvelope({
      success: true,
      run_succeeded: false,
      structuredContent: { data: { steps: [{ id: 's1' }], run_succeeded: false } },
    });
    expect(env.success).toBe(false);
    expect(env.data.steps).toEqual([{ id: 's1' }]);
  });

  it('hoists poll hints from top-level MCP JSON into data', () => {
    const env = normalizeMcpToolEnvelope({
      success: true,
      verification_action: 'discovery.job_status',
      data: { job_id: 'j1' },
    });
    expect(env.data.verification_action).toBe('discovery.job_status');
    expect(env.data.job_id).toBe('j1');
  });
});

describe('buildGraphViewerModel lifecycle', () => {
  it('normalizes executable work_state to actionable on viewer.state', () => {
    const model = buildGraphViewerModel(
      { tasks: [{ id: 'n1', kind: 'task' }] },
      { work_state: 'executable', node_id: 'n1' },
      'n1',
    );
    expect(model.state).toBe('actionable');
  });
});

describe('parseOrchestrateRunResponse', () => {
  it('parses REST focus-run handoff beside run', () => {
    const parsed = parseOrchestrateRunResponse(
      {
        success: true,
        run: { status: 'completed' },
        work_state: 'blocked',
        action_readiness: { can_execute: false },
        focus_node_id: 'leaf-1',
      },
      { focusNodeId: 'leaf-1' },
    );
    expect(parsed.success).toBe(true);
    expect(parsed.execute?.work_state).toBe('blocked');
    expect(parsed.execute?.action_readiness?.can_execute).toBe(false);
  });
});

describe('graph viewer metrics', () => {
  it('exposes parallelLanes on viewer model', () => {
    const model = buildGraphViewerModel({
      tasks: [
        { id: 'a', parent_id: 'g', parallelizable: true },
        { id: 'b', parent_id: 'g', parallelizable: true },
      ],
    });
    expect(model.parallelLanes).toEqual([['a', 'b']]);
  });

  it('rolls up direct child completion on parent nodes', () => {
    const model = buildGraphViewerModel({
      tasks: [
        { id: 'g', kind: 'goal' },
        { id: 'a', parent_id: 'g', status: 'completed' },
        { id: 'b', parent_id: 'g', status: 'pending' },
      ],
    });
    const parent = model.nodes.find((n) => n.id === 'g');
    expect(parent?.childCompletionPercent).toBe(50);
  });

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
      processPlanBacklog: jest.fn().mockResolvedValue({}),
      patchPlanOps: jest.fn().mockResolvedValue({ revision: 4, changed: [{ id: 'n1' }] }),
      mcpAction: jest.fn().mockResolvedValue({}),
    };
  };

  it('runs plan_get preflight before plan_patch when preflightStep hook set', async () => {
    const api = fleet();
    await followWorkGraphAction(
      api,
      9,
      {
        action: 'agents.plan_patch',
        params: { ops: [{ op: 'set', id: 'n1', path: 'title', value: 'x' }] },
      },
      undefined,
      undefined,
      {
        preflightStep: {
          action: 'agents.plan_get',
          params: { detail: 'compact', node_id: 'n1', home: 'project' },
        },
      },
    );
    expect(api.planGet).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ node_id: 'n1', detail: 'compact' }),
    );
    expect(api.patchPlanOps).toHaveBeenCalled();
  });

  it('retries patchPlanOps on plan_revision_conflict with refreshed revision', async () => {
    const api = fleet();
    api.patchPlanOps = jest
      .fn()
      .mockRejectedValueOnce({
        response: { status: 409, data: { error_code: 'plan_revision_conflict' } },
      })
      .mockResolvedValueOnce({ revision: 5, changed: [] });
    api.planGet = jest.fn().mockResolvedValue({ revision: 5 });
    const { patchPlanOps } = await import('../planGraph');
    const out = await patchPlanOps(api, 9, [{ op: 'set', id: 'n1', path: 'title', value: 'y' }], 3);
    expect(out.revision).toBe(5);
    expect(api.patchPlanOps).toHaveBeenCalledTimes(2);
    expect(api.planGet).toHaveBeenCalled();
  });

  it('patchPlanArchiveIds sends archive_ids with if_match_revision and CAS retry', async () => {
    const api = fleet();
    api.patchPlanOps = jest
      .fn()
      .mockRejectedValueOnce({
        response: { status: 409, data: { error_code: 'plan_revision_conflict' } },
      })
      .mockResolvedValueOnce({ revision: 6, changed: [{ id: 'c1' }] });
    api.planGet = jest.fn().mockResolvedValue({ revision: 6 });
    const { patchPlanArchiveIds } = await import('../planGraph');
    const out = await patchPlanArchiveIds(api, 9, ['c1', 'c2'], 4);
    expect(out.revision).toBe(6);
    expect(api.patchPlanOps).toHaveBeenCalledTimes(2);
    expect(api.patchPlanOps).toHaveBeenNthCalledWith(1, 9, {
      archive_ids: ['c1', 'c2'],
      if_match_revision: 4,
    });
    expect(api.patchPlanOps).toHaveBeenNthCalledWith(2, 9, {
      archive_ids: ['c1', 'c2'],
      if_match_revision: 6,
    });
    expect(api.planGet).toHaveBeenCalled();
  });

  it('fires onPlanMutation when plan_patch uses patchPlanOps', async () => {
    const api = fleet();
    const onPlanMutation = jest.fn();
    await followWorkGraphAction(
      api,
      9,
      {
        action: 'agents.plan_patch',
        params: { ops: [{ op: 'set', id: 'n1', path: 'title', value: 'x' }] },
      },
      undefined,
      undefined,
      { onPlanMutation },
    );
    expect(api.patchPlanOps).toHaveBeenCalled();
    expect(onPlanMutation).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 4, changed: [{ id: 'n1' }] }),
    );
  });

  it('merges loop goalId into workNext refresh when action params omit goal_id', async () => {
    const api = fleet();
    await followWorkGraphAction(
      api,
      7,
      { action: 'agents.plan_claim', params: { agent_id: 'a', node_id: 'n1' } },
      'goal-9',
    );
    expect(api.claimPlanNodes).toHaveBeenCalled();
    expect(api.workNext).toHaveBeenCalledWith(7, { detail: 'full', goal_id: 'goal-9' });
  });

  it('keeps an action goal_id ahead of the loop goalId', async () => {
    const api = fleet();
    await followWorkGraphAction(
      api,
      7,
      { action: 'agents.plan_execute', params: { node_id: 'n1', goal_id: 'from-action' } },
      'from-loop',
    );
    expect(api.workNext).toHaveBeenCalledWith(7, { detail: 'full', goal_id: 'from-action' });
  });

  it('hooks.graphHome strips env_uuid on personal workStatus dispatch', async () => {
    const api = fleet();
    await followWorkGraphAction(
      api,
      9,
      { action: 'agents.work_status', params: { env_uuid: 'env-x' } },
      undefined,
      'env-x',
      { graphHome: 'project_self' },
    );
    expect(api.workStatus).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ home: 'project_self' }),
    );
    const body = api.workStatus.mock.calls[0][1] as Record<string, unknown>;
    expect(body.env_uuid).toBeUndefined();
  });

  it('returns execute readiness handoff without work_next refresh when next_action absent', async () => {
    const api = fleet();
    api.planExecute.mockResolvedValue({
      node_id: 'n1',
      work_state: 'blocked',
      action_readiness: { can_execute: false, blocked_reason: 'rbac_denied' },
    });
    const packet = await followWorkGraphAction(api, 9, {
      action: 'agents.plan_execute',
      params: { node_id: 'n1' },
    });
    expect(api.workNext).not.toHaveBeenCalled();
    expect(packet.state).toBe('blocked');
    expect(packet.next_work?.action_readiness?.can_execute).toBe(false);
  });

  it('dispatches plan_reclaim_stale then refreshes work_next', async () => {
    const api = fleet();
    await followWorkGraphAction(api, 9, { action: 'agents.plan_reclaim_stale', params: {} });
    expect(api.reclaimStalePlanClaims).toHaveBeenCalledWith(9, undefined);
    expect(api.workNext).toHaveBeenCalledWith(9, { detail: 'full' });
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

  it('stamps env_uuid on claim when envUuid arg is set', async () => {
    const api = fleet();
    await followWorkGraphAction(
      api,
      7,
      { action: 'agents.plan_claim', params: { agent_id: 'a', node_id: 'n1' } },
      undefined,
      'sandbox-1',
    );
    expect(api.claimPlanNodes).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ env_uuid: 'sandbox-1' }),
    );
  });

  it('stamps env_uuid on plan_execute and refresh workNext', async () => {
    const api = fleet();
    await followWorkGraphAction(
      api,
      7,
      { action: 'agents.plan_execute', params: { node_id: 'n1' } },
      undefined,
      'sandbox-1',
    );
    expect(api.planExecute).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ env_uuid: 'sandbox-1' }),
    );
    expect(api.workNext).toHaveBeenCalledWith(7, { detail: 'full', env_uuid: 'sandbox-1' });
  });

  it('forwards locale on plan_execute and refresh workNext', async () => {
    const api = fleet();
    await followWorkGraphAction(
      api,
      7,
      { action: 'agents.plan_execute', params: { node_id: 'n1', locale: 'ru-RU' } },
    );
    expect(api.planExecute).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ locale: 'ru-RU' }),
    );
    expect(api.workNext).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ locale: 'ru-RU', detail: 'full' }),
    );
  });

  it('stamps env_uuid on plan_claim_required next_action', async () => {
    const api = fleet();
    const err = new Error('plan_claim_required') as Error & { error_code?: string };
    err.error_code = 'plan_claim_required';
    api.planExecute.mockRejectedValue(err);
    const packet = await followWorkGraphAction(
      api,
      9,
      { action: 'agents.plan_execute', params: { node_id: 'n1', agent_id: 'a1' } },
      undefined,
      'sandbox-1',
    );
    expect(packet.next_action?.params?.env_uuid).toBe('sandbox-1');
  });

  it('dispatches agents.plan_patch via planPatchMcp then refreshes', async () => {
    const api = fleet() as ReturnType<typeof fleet> & {
      planPatchMcp: jest.Mock;
    };
    api.planPatchMcp = jest.fn().mockResolvedValue({ ok: true });
    await followWorkGraphAction(api, 9, {
      action: 'agents.plan_patch',
      params: { patch: { tasks: [] }, if_match_revision: 2 },
    });
    expect(api.planPatchMcp).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ if_match_revision: 2 }),
    );
    expect(api.workNext).toHaveBeenCalledWith(9, { detail: 'full' });
  });

  it('routes run_failed to work_next handoff', async () => {
    const api = fleet();
    const err = new Error('run_failed') as Error & {
      error_code?: string;
      step?: { data?: { next_action?: { action: string; params: Record<string, unknown> } } };
    };
    err.error_code = 'run_failed';
    err.step = {
      data: {
        next_action: {
          action: 'agents.work_next',
          params: { node_id: 'n1' },
        },
      },
    };
    api.planExecute.mockRejectedValue(err);
    const packet = await followWorkGraphAction(api, 9, {
      action: 'agents.plan_execute',
      params: { node_id: 'n1' },
    });
    expect(packet.state).toBe('blocked');
    expect(packet.next_action?.action).toBe('agents.work_next');
    expect(api.workNext).not.toHaveBeenCalled();
  });

  it('stamps env_uuid on plan_completion_blocked follow-up', async () => {
    const api = fleet();
    const err = new Error('plan_completion_blocked') as Error & {
      error_code?: string;
      step?: { data?: { next_action?: { action: string; params: Record<string, unknown> } } };
    };
    err.error_code = 'plan_completion_blocked';
    err.step = {
      data: {
        next_action: {
          action: 'agents.plan_propose',
          params: { node_id: 'n1', mode: 'repair_plan' },
        },
      },
    };
    api.planExecute.mockRejectedValue(err);
    const packet = await followWorkGraphAction(
      api,
      9,
      { action: 'agents.plan_execute', params: { node_id: 'n1' } },
      undefined,
      'sandbox-1',
    );
    expect(packet.state).toBe('blocked');
    expect(packet.next_action?.params?.env_uuid).toBe('sandbox-1');
  });

  it('forwards env_uuid on agents.plan_process_backlog', async () => {
    const api = fleet();
    await followWorkGraphAction(
      api,
      9,
      { action: 'agents.plan_process_backlog', params: { auto_apply: true } },
      undefined,
      'sandbox-1',
    );
    expect(api.processPlanBacklog).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ env_uuid: 'sandbox-1', auto_apply: true }),
    );
    expect(api.workNext).toHaveBeenCalledWith(9, { detail: 'full', env_uuid: 'sandbox-1' });
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
    expect(api.planPropose).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        mode: 'repair_plan',
        node_id: 'n1',
        goal_text: 'Repair',
      }),
    );
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
    expect(api.workNext).toHaveBeenNthCalledWith(1, 3, { detail: 'full', goal_id: 'g-1' });
    expect(api.planExecute).toHaveBeenCalledWith(3, {
      node_id: 'n1',
      agent_id: undefined,
      goal_text: undefined,
      mode: undefined,
    });
    expect(api.workNext).toHaveBeenNthCalledWith(2, 3, { detail: 'full', goal_id: 'g-1' });
  });

  it('sends env_uuid on runWorkGraphLoop workNext refresh and plan_execute', async () => {
    const api = fleet();
    api.workNext
      .mockResolvedValueOnce({
        state: 'executable',
        next_action: { action: 'agents.plan_execute', params: { node_id: 'n1' } },
      })
      .mockResolvedValueOnce({ state: 'idle' });
    await runWorkGraphLoop(api, 3, { envUuid: 'sandbox-1', maxIterations: 3 });
    expect(api.workNext).toHaveBeenNthCalledWith(1, 3, { detail: 'full', env_uuid: 'sandbox-1' });
    expect(api.planExecute).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ node_id: 'n1', env_uuid: 'sandbox-1' }),
    );
    expect(api.workNext).toHaveBeenNthCalledWith(2, 3, { detail: 'full', env_uuid: 'sandbox-1' });
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

  it('maps work_state when top-level state is absent (MCP execute handoff)', () => {
    expect(parseWorkNextPacket({ work_state: 'executable', node_id: 'n1' }).state).toBe(
      'actionable',
    );
    expect(parseWorkNextPacket({ work_state: 'blocked', node_id: 'n1' }).state).toBe('blocked');
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

  it('blocks claim when claim.available is false', () => {
    expect(
      canClaimFromWorkNext({
        state: 'actionable',
        claim: { available: false },
      }),
    ).toBe(false);
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

describe('claimRevisionFromPacket', () => {
  it('uses compact packet.revision when params omit if_match_revision', () => {
    expect(
      claimRevisionFromPacket({
        revision: 12,
        next_action: { action: 'agents.plan_claim', params: { node_id: 'n1' } },
      }),
    ).toBe(12);
  });

  it('prefers next_action.params.if_match_revision over packet.revision', () => {
    expect(
      claimRevisionFromPacket({
        revision: 12,
        next_action: { action: 'agents.plan_claim', params: { if_match_revision: 7 } },
      }),
    ).toBe(7);
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

describe('parseWorkNextFromMcpExecute', () => {
  it('clears can_claim when batch step has work_graph_blocked result_kind', () => {
    const packet = parseWorkNextFromMcpExecute(
      { state: 'waiting', node_id: 'n-1' },
      {
        partial_success: true,
        steps: [
          {
            id: 'wn',
            result_kind: 'work_graph_blocked',
            result: { data: { state: 'waiting', blocked_reason: 'internal_execution_error' } },
          },
        ],
      },
    );
    expect(packet.partial_success).toBe(true);
    expect(packet.next_work?.action_readiness?.can_claim).toBe(false);
    expect(packet.error_code).toBe('work_graph_blocked');
  });
});

describe('workGraphErrorToPacket', () => {
  it('synthesizes plan_claim from error_code with env stamp', () => {
    const packet = workGraphErrorToPacket(
      { error_code: 'plan_claim_required' },
      { projectId: 3, envUuid: 'env-1', nodeId: 'n-9' },
    );
    expect(packet?.state).toBe('actionable');
    expect(packet?.next_action?.action).toBe('agents.plan_claim');
    expect(packet?.next_action?.params).toMatchObject({
      project_id: 3,
      node_id: 'n-9',
      env_uuid: 'env-1',
    });
  });

  it('parses recovery next_actions from step data', () => {
    const packet = workGraphErrorToPacket({
      error_code: 'run_failed',
      step: {
        data: {
          next_actions: [{ action: 'agents.plan_recovery_scan', params: { project_id: 1 } }],
        },
      },
    });
    expect(packet?.next_action?.action).toBe('agents.plan_recovery_scan');
  });

  it('synthesizes work_next handoff for role_mismatch', () => {
    const packet = workGraphErrorToPacket(
      { error_code: 'role_mismatch' },
      { projectId: 2, nodeId: 'n-role' },
    );
    expect(packet?.next_action?.action).toBe('agents.work_next');
    expect(packet?.next_action?.params).toMatchObject({
      handoff: true,
      node_id: 'n-role',
    });
  });

  it('synthesizes ensure_agent preview for capability_mismatch', () => {
    const packet = workGraphErrorToPacket(
      { error_code: 'capability_mismatch' },
      { projectId: 5, nodeId: 'n-cap' },
    );
    expect(packet?.next_action?.action).toBe('agents.ensure_agent');
    expect(packet?.next_action?.params).toMatchObject({
      project_id: 5,
      node_id: 'n-cap',
      create: false,
    });
  });

  it('synthesizes graph_file_get for storage_content_conflict', () => {
    const packet = workGraphErrorToPacket(
      {
        error_code: 'storage_content_conflict',
        response: { data: { file_id: 'f1', node_id: 'n1' } },
      },
      { projectId: 4, nodeId: 'n1' },
    );
    expect(packet?.next_action?.action).toBe('agents.graph_file_get');
    expect(packet?.next_action?.params).toMatchObject({
      project_id: 4,
      node_id: 'n1',
      file_id: 'f1',
    });
  });

  it('synthesizes plan_get reload for plan_revision_conflict on personal home', () => {
    const packet = workGraphErrorToPacket(
      {
        error_code: 'plan_revision_conflict',
        recovery: {
          action: 'agents.plan_get',
          params: { project_id: 4, home: 'self', detail: 'compact' },
        },
      },
      { projectId: 4, envUuid: 'env-should-drop', home: 'self' },
    );
    expect(packet?.state).toBe('blocked');
    expect(packet?.next_action?.action).toBe('agents.plan_get');
    expect(packet?.next_action?.params).toMatchObject({
      project_id: 4,
      home: 'project_self',
      detail: 'compact',
    });
    expect(packet?.next_action?.params).not.toHaveProperty('env_uuid');
  });

  it('merges batchMeta workflow_diagnostics into handoff', () => {
    const packet = workGraphErrorToPacket({
      error_code: 'mcp_error',
      batchMeta: {
        workflow_diagnostics: [
          { code: 'workflow_batch_bind_failed', severity: 'error', message: 'guidance row missing' },
        ],
      },
    }, { projectId: 12 });
    expect(packet?.next_action?.action).toBe('agents.reconcile_binding');
    expect(packet?.next_action?.params).toMatchObject({ project_id: 12, repair: true });
  });

  it('synthesizes plan_reclaim_stale for expired_claim code-only', () => {
    const packet = workGraphErrorToPacket(
      { error_code: 'expired_claim' },
      { projectId: 2, nodeId: 'n1' },
    );
    expect(packet?.next_action?.action).toBe('agents.plan_reclaim_stale');
    expect(packet?.next_action?.params).toMatchObject({ project_id: 2 });
  });

  it('synthesizes wip_full recovery ladder for code-only errors', () => {
    const packet = workGraphErrorToPacket(
      { error_code: 'wip_full' },
      { projectId: 3, nodeId: 'n2' },
    );
    expect(packet?.next_action?.action).toBe('agents.plan_get');
    expect(packet?.next_action?.params).toMatchObject({
      project_id: 3,
      node_id: 'n2',
      detail: 'compact',
      max_depth: 0,
      include: ['prompt'],
    });
    expect(packet?.next_actions?.[0]?.action).toBe('agents.plan_reclaim_stale');
    expect(packet?.next_actions?.[1]?.action).toBe('agents.plan_get');
  });

  it('synthesizes generation.fork for generation_fork_required code-only', () => {
    const packet = workGraphErrorToPacket(
      { error_code: 'generation_fork_required' },
      { projectId: 9 },
    );
    expect(packet?.next_action?.action).toBe('generation.fork');
    expect(packet?.next_action?.params).toMatchObject({ project_id: 9 });
  });

  it('synthesizes plan_get for node_not_found code-only', () => {
    const packet = workGraphErrorToPacket(
      { error_code: 'node_not_found' },
      { projectId: 5, nodeId: 'n4' },
    );
    expect(packet?.next_action?.action).toBe('agents.plan_get');
    expect(packet?.next_action?.params).toMatchObject({
      project_id: 5,
      include_claimable: true,
      detail: 'compact',
    });
  });

  it('synthesizes work_next for not_executable code-only', () => {
    const packet = workGraphErrorToPacket(
      { error_code: 'not_executable' },
      { projectId: 4, nodeId: 'n3' },
    );
    expect(packet?.next_action?.action).toBe('agents.work_next');
    expect(packet?.next_action?.params).toMatchObject({
      project_id: 4,
      node_id: 'n3',
      detail: 'compact',
    });
  });

  it('uses handoff params for work_next_enrich_failed diagnostic', () => {
    const packet = workGraphErrorToPacket(
      {
        error_code: 'mcp_error',
        workflow_diagnostics: [
          { code: 'work_next_enrich_failed', severity: 'error', message: 'enrich' },
        ],
      },
      { projectId: 7 },
    );
    expect(packet?.next_action?.action).toBe('agents.work_next');
    expect(packet?.next_action?.params).toMatchObject({
      project_id: 7,
      handoff: true,
      detail: 'compact',
    });
    expect(packet?.next_action?.params).not.toHaveProperty('repair');
  });

  it('maps waiting_for_approval to approve_run handoff', () => {
    const packet = workGraphErrorToPacket(
      {
        error_code: 'waiting_for_approval',
        next_action: {
          action: 'agents.approve_run',
          params: { project_id: 3, run_id: 'run-1', agent_id: 'a-1' },
        },
      },
      { projectId: 3 },
    );
    expect(packet?.state).toBe('waiting');
    expect(packet?.next_action?.action).toBe('agents.approve_run');
  });

  it('unwraps recovery_block.next_actions', () => {
    const packet = workGraphErrorToPacket({
      error_code: 'role_mismatch',
      step: {
        data: {
          recovery_block: {
            next_actions: [
              {
                action: 'agents.work_next',
                params: { project_id: 2, handoff: true, node_id: 't1' },
              },
            ],
          },
        },
      },
    });
    expect(packet?.next_action?.action).toBe('agents.work_next');
    expect(packet?.next_action?.params).toMatchObject({ handoff: true, node_id: 't1' });
  });

  it('clearWorkGraphPreflightFromPacket strips consumed hints', () => {
    const { clearWorkGraphPreflightFromPacket } = require('../planGraph');
    const out = clearWorkGraphPreflightFromPacket({
      state: 'blocked',
      diagnostics: {
        plan_patch_recovery: {
          preflight_step: { action: 'agents.plan_get', params: { node_id: 'n1' } },
          preflight_read: { action: 'agents.plan_get', params: {} },
          ops_compact: { canonical: ['set'] },
        },
      },
    });
    const rec = (out.diagnostics as Record<string, unknown>)?.plan_patch_recovery as Record<
      string,
      unknown
    >;
    expect(rec?.preflight_step).toBeUndefined();
    expect(rec?.preflight_read).toBeUndefined();
    expect(rec?.ops_compact).toBeTruthy();
  });

  it('workGraphPreflightStepFromPacket reads diagnostics.plan_patch_recovery', () => {
    const { workGraphPreflightStepFromPacket } = require('../planGraph');
    const step = workGraphPreflightStepFromPacket({
      diagnostics: {
        plan_patch_recovery: {
          preflight_step: {
            action: 'agents.plan_get',
            params: { project_id: 1, node_id: 'n1', detail: 'compact', home: 'project' },
          },
        },
      },
    });
    expect(step?.action).toBe('agents.plan_get');
    expect(step?.params.node_id).toBe('n1');
  });

  it('workGraphErrorToPacket exposes preflight_step when next_action differs', () => {
    const { workGraphErrorToPacket } = require('../planGraph');
    const packet = workGraphErrorToPacket({
      error_code: 'plan_graph_children_exceeded',
      code: 'plan_graph_children_exceeded',
      recovery: {
        next_action: { action: 'agents.plan_propose', params: { project_id: 1, mode: 'decompose_node' } },
      },
      preflight_read: {
        action: 'agents.plan_get',
        params: { project_id: 1, home: 'project', detail: 'compact', node_id: 'plan_leaf_example' },
      },
    });
    const rec = (packet?.diagnostics as Record<string, unknown>)?.plan_patch_recovery as Record<
      string,
      unknown
    >;
    expect((rec?.preflight_step as { action?: string })?.action).toBe('agents.plan_get');
  });

  it('planPatchPreflightReadStep maps preflight_read wire', () => {
    const { planPatchPreflightReadStep } = require('../planGraph');
    const step = planPatchPreflightReadStep({
      preflight_read: {
        action: 'agents.plan_get',
        params: {
          detail: 'compact',
          node_id: 'plan_leaf_example',
          project_id: 1,
          home: 'project',
        },
      },
    });
    expect(step?.action).toBe('agents.plan_get');
    expect(step?.params.node_id).toBe('plan_leaf_example');
  });

  it('prefers nested recovery.next_action for plan_completion_gates', () => {
    const packet = workGraphErrorToPacket({
      error_code: 'plan_completion_gates',
      code: 'plan_completion_gates',
      next_action: { action: 'agents.plan_recovery_scan', params: { project_id: 1 } },
      recovery: {
        next_action: {
          action: 'agents.plan_patch',
          params: { project_id: 1 },
          reason: 'waive then complete',
          example_ops: [{ op: 'set_meta', id: 'n1', key: 'completion_waived', value: true }],
        },
      },
      suggested_archive_ids: ['c1'],
      ops_compact: { canonical: ['set_meta'], aliases: {} },
    });
    expect(packet?.next_action?.action).toBe('agents.plan_patch');
    expect(packet?.blocked_reason_code).toBe('plan_completion_gates');
    const rec = (packet?.diagnostics as Record<string, unknown>)?.plan_patch_recovery as Record<
      string,
      unknown
    >;
    expect(rec?.suggested_archive_ids).toEqual(['c1']);
    expect(rec?.ops_compact).toBeTruthy();
  });

  it('throws for unknown followWorkGraphAction', async () => {
    const api = { workNext: jest.fn() };
    await expect(
      followWorkGraphAction(api, 9, { action: 'agents.unknown_action', params: {} }),
    ).rejects.toThrow('work_graph_action_not_dispatchable');
  });
});

describe('followWorkGraphAction codegen smoke (G-2-01)', () => {
  const CODEGEN_ACTIONS = [
    'agents.approve_run',
    'agents.create_from_template',
    'agents.ensure_agent',
    'agents.fleet_diagnostics',
    'agents.graph_file_edit',
    'agents.graph_file_get',
    'agents.graph_file_list',
    'agents.graph_file_put',
    'agents.graph_health',
    'agents.orchestrate',
    'agents.plan_apply_proposal',
    'agents.plan_claim',
    'agents.plan_execute',
    'agents.plan_get',
    'agents.plan_ingest',
    'agents.plan_patch',
    'agents.plan_process_backlog',
    'agents.plan_propose',
    'agents.plan_reclaim_stale',
    'agents.plan_recovery_scan',
    'agents.plan_suggest_tree',
    'agents.reconcile_binding',
    'agents.run',
    'agents.run_get',
    'agents.traces',
    'agents.skills_list',
    'agents.team',
    'agents.team.create',
    'agents.work_next',
    'agents.work_status',
    'generation.fork',
  ] as const;

  function mockFleet() {
    const idle = { state: 'idle' as const };
    return {
      workNext: jest.fn().mockResolvedValue(idle),
      workStatus: jest.fn().mockResolvedValue(idle),
      claimPlanNodes: jest.fn().mockResolvedValue({}),
      planExecute: jest.fn().mockResolvedValue({}),
      ensureAgent: jest.fn().mockResolvedValue({}),
      planRecoveryScan: jest.fn().mockResolvedValue({}),
      planPropose: jest.fn().mockResolvedValue({}),
      planApplyProposal: jest.fn().mockResolvedValue({}),
      planPatchMcp: jest.fn().mockResolvedValue({}),
      reclaimStalePlanClaims: jest.fn().mockResolvedValue({}),
      createFromTemplate: jest.fn().mockResolvedValue({}),
      planGet: jest.fn().mockResolvedValue({}),
      team: jest.fn().mockResolvedValue({}),
      teamCreate: jest.fn().mockResolvedValue({}),
      processPlanBacklog: jest.fn().mockResolvedValue({}),
      patchPlanOps: jest.fn().mockResolvedValue({}),
      graphFilePut: jest.fn().mockResolvedValue({}),
      graphFileGet: jest.fn().mockResolvedValue({}),
      graphFileEdit: jest.fn().mockResolvedValue({}),
      graphFileList: jest.fn().mockResolvedValue({}),
      mcpAction: jest.fn().mockResolvedValue({}),
    };
  }

  it('agents.graph_file_get invokes onGraphFileResult with fleet payload', async () => {
    const payload = {
      storage_ref: { file_id: 'f1' },
      text: { content: 'hello', truncated: false },
    };
    const graphFileGet = jest.fn().mockResolvedValue(payload);
    const workNext = jest.fn().mockResolvedValue({ state: 'idle' });
    const onGraphFileResult = jest.fn();
    await followWorkGraphAction(
      { ...mockFleet(), graphFileGet, workNext } as never,
      1,
      {
        action: 'agents.graph_file_get',
        params: { node_id: 'task-1', file_id: 'f1' },
      },
      undefined,
      undefined,
      { onGraphFileResult },
    );
    expect(graphFileGet).toHaveBeenCalled();
    expect(onGraphFileResult).toHaveBeenCalledWith(payload);
    expect(workNext).toHaveBeenCalled();
  });

  it.each(CODEGEN_ACTIONS)('dispatches %s without throw', async (action) => {
    await followWorkGraphAction(mockFleet() as never, 1, {
      action,
      params: {
        project_id: 1,
        agent_id: 'fleet-1',
        node_id: 'task-1',
        if_match_revision: 1,
      },
    });
  });
});

describe('runWorkGraphLoop personal home', () => {
  it('refresh workNext omits env_uuid and uses project_self', async () => {
    const api = {
      workNext: jest.fn().mockResolvedValue({ state: 'idle' }),
    };
    await runWorkGraphLoop(api, 3, {
      maxIterations: 1,
      home: 'self',
      envUuid: 'sandbox-should-drop',
    });
    expect(api.workNext).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ home: 'project_self', detail: 'full' }),
    );
    const body = api.workNext.mock.calls[0][1] as Record<string, unknown>;
    expect(body.env_uuid).toBeUndefined();
  });
});

describe('ensureAgentSaga', () => {
  it('commits create=true on blocked_reason provision_required', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const mockFleet = {
      ensureAgent: async (_pid: number, body: Record<string, unknown>) => {
        calls.push(body);
        if (body.create === false) {
          return {
            blocked_reason: 'provision_required',
            preview_template_id: 'tpl@v1',
            graph_revision: 4,
          };
        }
        return { created: true, agent_id: 'a1' };
      },
    };
    const out = await ensureAgentSaga(mockFleet, 1, 'node-x', 'env-z');
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({
      create: true,
      preview_template_id: 'tpl@v1',
      graph_revision: 4,
      env_uuid: 'env-z',
    });
    expect(out).toMatchObject({ created: true });
  });
});
