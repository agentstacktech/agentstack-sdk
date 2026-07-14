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

