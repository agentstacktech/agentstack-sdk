import { AgentsFleet, parseAgentRunSSE } from '../AgentsFleet';

function streamFromText(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe('parseAgentRunSSE', () => {
  it('parses data frames and skips done sentinels', async () => {
    const stream = streamFromText(
      [
        'event: run_event',
        'data: {"kind":"checkpoint","stage":"execute_start","data":{"agent_id":"a1"}}',
        '',
        'event: done',
        'data: [DONE]',
        '',
      ].join('\n'),
    );

    const events = [];
    for await (const event of parseAgentRunSSE(stream)) {
      events.push(event);
    }

    expect(events).toEqual([
      {
        kind: 'checkpoint',
        stage: 'execute_start',
        data: { agent_id: 'a1' },
      },
    ]);
  });

  it('returns raw events for non-json data frames', async () => {
    const stream = streamFromText('data: not-json\n\n');

    const events = [];
    for await (const event of parseAgentRunSSE(stream)) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'raw',
      data: { raw: 'not-json' },
    });
  });

  it('expands normalized events array frames and emits terminal status', async () => {
    const stream = streamFromText(
      [
        'data: {"events":[{"kind":"stage","stage":"act","data":{"ok":true}}],"terminal":"completed"}',
        '',
      ].join('\n'),
    );

    const events = [];
    for await (const event of parseAgentRunSSE(stream)) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ kind: 'stage', stage: 'act' });
    expect(events[1]).toMatchObject({ kind: 'terminal', data: { status: 'completed' } });
  });
});

describe('AgentsFleet approvals', () => {
  it('maps camelCase start options to REST fields', async () => {
    const post = jest.fn().mockResolvedValue({ data: { success: true, run_uuid: 'run-1' } });
    const agents = new AgentsFleet({ post } as never);

    await agents.startRun(1, 'agent-1', {
      input: { topic: 'ops' },
      idempotencyKey: 'idem-1',
      wait: true,
      waitTimeoutS: 20,
    });

    expect(post).toHaveBeenCalledWith('/projects/1/agents/agent-1/runs/start', {
      input: { topic: 'ops' },
      idempotency_key: 'idem-1',
      wait: true,
      wait_timeout_s: 20,
      parent_run_id: undefined,
      root_run_id: undefined,
      handoff_to_agent_id: undefined,
      handoff_reason: undefined,
    });
  });

  it('maps camelCase approval options to REST fields', async () => {
    const post = jest.fn().mockResolvedValue({ data: { success: true } });
    const agents = new AgentsFleet({ post } as never);

    await agents.approveRun(1, 'agent-1', 'run-1', {
      reviewerNote: 'looks scoped',
      reviewedParams: { body: 'ok' },
      approvalArtifactHash: 'hash-1',
    });

    expect(post).toHaveBeenCalledWith('/projects/1/agents/agent-1/runs/run-1/approve', {
      reviewed_params: { body: 'ok' },
      reviewer_note: 'looks scoped',
      approval_artifact_hash: 'hash-1',
    });
  });

  it('maps stop reviewer note aliases to REST fields', async () => {
    const post = jest.fn().mockResolvedValue({ data: { success: true } });
    const agents = new AgentsFleet({ post } as never);

    await agents.stopRun(1, 'agent-1', 'run-1', {
      reason: 'approval_rejected',
      reviewerNote: 'unsafe write',
    });

    expect(post).toHaveBeenCalledWith('/projects/1/agents/agent-1/runs/run-1/stop', {
      reason: 'approval_rejected',
      reviewer_note: 'unsafe write',
    });
  });

  it('passes run list filters including limit', async () => {
    const get = jest.fn().mockResolvedValue({ data: { success: true, runs: [] } });
    const agents = new AgentsFleet({ get } as never);

    await agents.listRuns(1, 'agent-1', {
      status: 'running',
      since: '2026-01-01T00:00:00Z',
      with_agc_purchase: false,
      limit: 25,
    });

    expect(get).toHaveBeenCalledWith('/projects/1/agents/agent-1/runs', {
      params: {
        status: 'running',
        since: '2026-01-01T00:00:00Z',
        with_agc_purchase: 'false',
        limit: 25,
      },
    });
  });

  it('routes project orchestrator REST via orchestratorBase', async () => {
    const get = jest.fn().mockImplementation((url: string) => {
      if (url.endsWith('/thread')) {
        return Promise.resolve({ data: { success: true, turns: [] } });
      }
      if (url.endsWith('/export-pack')) {
        return Promise.resolve({ data: { success: true, pack: {} } });
      }
      return Promise.resolve({
        data: { success: true, orchestrator: { agent_uuid: 'a1' }, task_list: { tasks: [] } },
      });
    });
    const patch = jest.fn().mockResolvedValue({
      data: { success: true, orchestrator: { agent_uuid: 'a1' } },
    });
    const post = jest.fn().mockResolvedValue({ data: { success: true, run: { status: 'ok' } } });
    const agents = new AgentsFleet({ get, patch, post } as never);

    await agents.getOrchestrator(9);
    await agents.getOrchestratorThread(9, 20);
    await agents.patchOrchestrator(9, { competence_tier: 'dev_operator' });
    await agents.exportOrchestratorPack(9);
    await agents.orchestrate(9, 'hello', { channel: 'workspace' });
    await agents.importOrchestratorPack(9, { pack_version: 1 });

    expect(get).toHaveBeenCalledWith('/api/projects/9/orchestrator', { params: undefined });
    expect(get).toHaveBeenCalledWith('/api/projects/9/orchestrator/thread', { params: { limit: 20 } });
    await agents.getOrchestratorThread(9, { limit: 10, beforeIndex: 7 });
    expect(get).toHaveBeenCalledWith('/api/projects/9/orchestrator/thread', {
      params: { limit: 10, before_index: 7 },
    });
    expect(get).toHaveBeenCalledWith('/api/projects/9/orchestrator/export-pack');
    expect(patch).toHaveBeenCalledWith('/api/projects/9/orchestrator', {
      patch: { competence_tier: 'dev_operator' },
    });
    expect(post).toHaveBeenCalledWith('/api/projects/9/orchestrator/run', {
      message: 'hello',
      channel: 'workspace',
      conversation_id: undefined,
      bot_uuid: undefined,
      wait: true,
    });
    expect(post).toHaveBeenCalledWith('/api/projects/9/orchestrator/import-pack', {
      pack: { pack_version: 1 },
    });
  });

  it('uses REST GET work-next with blocked paging on project home', async () => {
    const get = jest.fn().mockResolvedValue({
      data: { state: 'idle', revision: 1, next_action: null },
    });
    const agents = new AgentsFleet({ get } as never);

    await agents.workNext(42, {
      home: 'project',
      claim: false,
      blocked_cursor: 'bc1',
      blocked_limit: 16,
      detail: 'full',
    });

    expect(get).toHaveBeenCalledWith('/api/projects/42/orchestrator/work-next', {
      params: expect.objectContaining({
        blocked_cursor: 'bc1',
        blocked_limit: '16',
        detail: 'full',
      }),
    });
  });

  it('passes env_uuid on workNext REST GET', async () => {
    const get = jest.fn().mockResolvedValue({
      data: { state: 'idle', revision: 1 },
    });
    const agents = new AgentsFleet({ get } as never);

    await agents.workNext(9, { env_uuid: 'sandbox-env-1', claim: false });

    expect(get).toHaveBeenCalledWith('/api/projects/9/orchestrator/work-next', {
      params: expect.objectContaining({ env_uuid: 'sandbox-env-1' }),
    });
  });

  it('strips env_uuid on personal workNext REST GET', async () => {
    const get = jest.fn().mockResolvedValue({
      data: { state: 'idle', revision: 1 },
    });
    const agents = new AgentsFleet({ get } as never);

    await agents.workNext(9, {
      env_uuid: 'sandbox-env-1',
      home: 'project_self',
      claim: false,
    });

    expect(get).toHaveBeenCalledWith('/api/projects/9/orchestrator/work-next', {
      params: expect.objectContaining({ home: 'project_self' }),
    });
    const params = get.mock.calls[0][1]?.params as Record<string, unknown>;
    expect(params.env_uuid).toBeUndefined();
  });

  it('strips env_uuid on personal workStatus MCP batch', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { ok: true, results: [{ result: { state: 'idle' } }] },
    });
    const agents = new AgentsFleet({ post } as never);

    await agents.workStatus(9, {
      env_uuid: 'sandbox-env-1',
      home: 'self',
    });

    const envelope = post.mock.calls[0][1] as {
      steps: Array<{ params: Record<string, unknown> }>;
    };
    expect(envelope.steps[0].params).toMatchObject({
      project_id: 9,
      home: 'project_self',
    });
    expect(envelope.steps[0].params.env_uuid).toBeUndefined();
  });

  it('fleetDiagnosticsMcp strips env on personal home', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { ok: true, results: [{ result: { stale_orchestrator_binding_count: 0 } }] },
    });
    const agents = new AgentsFleet({ post } as never);

    await agents.fleetDiagnosticsMcp(9, {
      env_uuid: 'sandbox-env-1',
      home: 'project_self',
      include_health_snapshot: true,
    });

    const envelope = post.mock.calls[0][1] as {
      steps: Array<{ action: string; params: Record<string, unknown> }>;
    };
    expect(envelope.steps[0].action).toBe('agents.fleet_diagnostics');
    expect(envelope.steps[0].params).toMatchObject({
      project_id: 9,
      home: 'project_self',
      include_health_snapshot: true,
    });
    expect(envelope.steps[0].params.env_uuid).toBeUndefined();
  });

  it('omits env_uuid on personal importOrchestratorPack', async () => {
    const post = jest.fn().mockResolvedValue({ data: { success: true } });
    const agents = new AgentsFleet({ post } as never);

    await agents.importOrchestratorPack(9, { pack_version: 1 }, 'env-x', 'project_self');

    expect(post).toHaveBeenCalledWith('/api/projects/9/orchestrator/import-pack', {
      pack: { pack_version: 1 },
      home: 'project_self',
    });
  });

  it('passes env_uuid and execution flags on planGet', async () => {
    const get = jest.fn().mockResolvedValue({
      data: { success: true, task_list: { tasks: [] } },
    });
    const agents = new AgentsFleet({ get } as never);

    await agents.planGet(9, {
      include_analytics: true,
      include_execution_eligibility: true,
      compact: true,
      env_uuid: 'sandbox-env-1',
    });

    expect(get).toHaveBeenCalledWith('/api/projects/9/orchestrator', {
      params: {
        include_analytics: 'true',
        include_execution_eligibility: 'true',
        compact: 'true',
        env_uuid: 'sandbox-env-1',
      },
    });
  });

  it('passes env_uuid on planPropose REST body', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { success: true, proposal: {}, validation: {} },
    });
    const agents = new AgentsFleet({ post } as never);

    await agents.planPropose(9, {
      mode: 'repair_plan',
      node_id: 'n-1',
      env_uuid: 'sandbox-env-1',
    });

    expect(post).toHaveBeenCalledWith('/api/projects/9/orchestrator/plan/propose', {
      mode: 'repair_plan',
      node_id: 'n-1',
      env_uuid: 'sandbox-env-1',
    });
  });

  it('routes patchPlanOps to REST postPlanOps on project home without locale', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { success: true, ok: true, changed: [], revision: 2 },
    });
    const agents = new AgentsFleet({ post } as never);

    await agents.patchPlanOps(9, {
      ops: [{ op: 'set', id: 'n1', title: 't' }],
      if_match_revision: 1,
      home: 'project',
    });

    expect(post).toHaveBeenCalledWith('/api/projects/9/orchestrator/plan/ops', {
      ops: [{ op: 'set', id: 'n1', title: 't' }],
      if_match_revision: 1,
      home: 'project',
    });
  });

  it('routes archive_ids-only patchPlanOps to REST postPlanOps', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { success: true, ok: true, changed: [{ id: 'c1' }], revision: 5 },
    });
    const agents = new AgentsFleet({ post } as never);

    await agents.patchPlanOps(9, {
      archive_ids: ['c1', 'c2'],
      if_match_revision: 4,
      home: 'project',
    });

    expect(post).toHaveBeenCalledWith('/api/projects/9/orchestrator/plan/ops', {
      archive_ids: ['c1', 'c2'],
      if_match_revision: 4,
      home: 'project',
    });
  });

  it('routes patchPlanOps to MCP when locale is set on project home', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { steps: [{ status: 'success', result: { ok: true } }] },
    });
    const agents = new AgentsFleet({ post } as never);

    await agents.patchPlanOps(9, {
      ops: [{ op: 'archive', id: 'n1' }],
      home: 'project',
      locale: 'en-US',
    });

    expect(post).toHaveBeenCalledWith(
      '/mcp',
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            action: 'agents.plan_patch',
          }),
        ],
      }),
    );
  });

  it('passes env_uuid on planApplyProposal REST body', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { success: true, applied: true },
    });
    const agents = new AgentsFleet({ post } as never);

    await agents.planApplyProposal(9, {
      proposal: { base_graph_revision: 1, nodes_to_create: [] },
      if_match_revision: 3,
      env_uuid: 'sandbox-env-1',
    });

    expect(post).toHaveBeenCalledWith('/api/projects/9/orchestrator/plan/apply-proposal', {
      proposal: { base_graph_revision: 1, nodes_to_create: [] },
      if_match_revision: 3,
      env_uuid: 'sandbox-env-1',
    });
  });

  it('passes include_execution_eligibility on getAgentPlan', async () => {
    const get = jest.fn().mockResolvedValue({
      data: { success: true, task_list: { tasks: [] }, execution_eligibility: { leaves: [] } },
    });
    const agents = new AgentsFleet({ get } as never);

    await agents.getAgentPlan(9, 'agent-1', { include_execution_eligibility: true });

    expect(get).toHaveBeenCalledWith('/api/projects/9/orchestrator/plan/agent/agent-1', {
      params: { include_execution_eligibility: 'true' },
    });
  });

  it('parses orchestrate focus-run handoff fields', async () => {
    const post = jest.fn().mockResolvedValue({
      data: {
        success: true,
        run: { status: 'completed' },
        work_state: 'executable',
        focus_node_id: 'leaf-1',
        action_readiness: { can_execute: true },
      },
    });
    const agents = new AgentsFleet({ post } as never);

    const res = await agents.orchestrate(9, 'execute node', {
      focusNodeId: 'leaf-1',
      wait: false,
      channel: 'workspace',
    });

    expect(post).toHaveBeenCalledWith('/api/projects/9/orchestrator/run', {
      message: 'execute node',
      channel: 'workspace',
      conversation_id: undefined,
      bot_uuid: undefined,
      wait: false,
      surface: undefined,
      focus_node_id: 'leaf-1',
    });
    expect(res.execute?.work_state).toBe('actionable');
    expect(res.run.status).toBe('completed');
  });

  it('forwards locale on planRecoveryScan MCP batch', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { ok: true, results: [{ result: { candidates: [] } }] },
    });
    const agents = new AgentsFleet({ post } as never);

    await agents.planRecoveryScan(9, { limit: 8, env_uuid: 'env-1', locale: 'ru-RU' });

    expect(post).toHaveBeenCalledWith(
      '/mcp',
      expect.objectContaining({
        context: expect.objectContaining({ locale: 'ru-RU', project_id: 9 }),
        steps: [
          expect.objectContaining({
            action: 'agents.plan_recovery_scan',
            params: expect.objectContaining({
              project_id: 9,
              limit: 8,
              env_uuid: 'env-1',
            }),
          }),
        ],
      }),
    );
  });

  it('passes pending approval filters including camelCase stale flag', async () => {
    const get = jest.fn().mockResolvedValue({ data: { success: true, project_id: 1, items: [] } });
    const agents = new AgentsFleet({ get } as never);

    await agents.listPendingApprovals(1, {
      limit: 25,
      staleOnly: true,
    });

    expect(get).toHaveBeenCalledWith('/projects/1/agents/approvals/pending', {
      params: {
        limit: 25,
        stale_only: true,
      },
    });
  });
});

