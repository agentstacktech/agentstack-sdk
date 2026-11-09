/**
 * mcpExecute / URL helpers — Jest SoT for @agentstack/sdk.
 */
import { resolveMcpUrl, resolvePublicOrigin } from '../urls';
import {
  extractBatchMeta,
  extractResults,
  mergeExecuteEnvelopeIntoPacket,
  mcpExecute,
  normalizeWorkflowStatus,
  readInverseEnvelope,
} from '../execute';

describe('mcp urls', () => {
  it('strips /api to /mcp', () => {
    expect(resolveMcpUrl('https://agentstack.tech/api')).toBe('https://agentstack.tech/mcp');
    expect(resolveMcpUrl('https://agentstack.tech/api/')).toBe('https://agentstack.tech/mcp');
  });

  it('resolvePublicOrigin', () => {
    expect(resolvePublicOrigin('https://agentstack.tech/api')).toBe('https://agentstack.tech');
  });
});

describe('mcpExecute', () => {
  it('posts JSON-RPC tools/call and parses results', async () => {
    const calls: unknown[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          result: { results: [{ id: 'step_0', ok: true, result: { actions: [] } }] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      const out = await mcpExecute([{ action: 'discovery.list', params: {} }], {
        mcpUrl: 'https://agentstack.tech/mcp',
        token: 'tok',
        projectId: 1,
      });
      expect(out.results?.[0]?.ok).toBe(true);
      const body = calls[0] as { method?: string; params?: { name?: string } };
      expect(body.method).toBe('tools/call');
      expect(body.params?.name).toBe('agentstack.execute');
      const args = (body as { params?: { arguments?: { options?: { goal?: string } } } }).params
        ?.arguments;
      expect(args?.options?.goal).toBeUndefined();
    } finally {
      globalThis.fetch = original;
    }
  });

  it('sends goal and reads the inverse envelope', async () => {
    const calls: unknown[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          result: {
            instruction_packet: {
              step_id: 'session',
              allowed_actions: ['auth.get_profile'],
              text: 'Use auth.get_profile.',
              writes_allowed: true,
            },
            observed: { completed_steps: [] },
            workflow_run_id: 'run-1',
            completion: { workflow_status: 'pending' },
            results: [{ id: 'step_0', ok: true }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;
    try {
      const { mcpExecute, readInverseEnvelope } = await import('../execute');
      const out = await mcpExecute([{ action: 'auth.get_profile', params: {} }], {
        mcpUrl: 'https://agentstack.tech/mcp',
        token: 'tok',
        projectId: 1,
        goal: 'build a saas',
        density: 'guided',
      });
      const body = calls[0] as {
        params?: { arguments?: { options?: { goal?: string; density?: string } } };
      };
      expect(body.params?.arguments?.options?.goal).toBe('build a saas');
      expect(body.params?.arguments?.options?.density).toBe('guided');
      const view = readInverseEnvelope(out.raw);
      expect(view?.packet?.allowed_actions[0]).toBe('auth.get_profile');
      expect(view?.workflowStatus).toBe('pending');
      const finished = readInverseEnvelope({
        result: { completion: { workflow_status: 'completed' } },
      });
      expect(finished?.packet).toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('readInverseEnvelope', () => {
  it('reads goal_verification from workflow_completion', () => {
    const { readInverseEnvelope } = require('../execute');
    const env = readInverseEnvelope({
      result: {
        workflow_run_id: 'wr-1',
        workflow_completion: {
          goal_verification: { verified: false, pending: ['build_ok'] },
        },
        instruction_packet: { step_id: 's1', allowed_actions: ['logic.list'] },
      },
    });
    expect(env?.goalVerification?.pending).toEqual(['build_ok']);
  });
});

describe('goalVerificationFromEnvelope', () => {
  it('skips empty top goal_verification for nested workflow_completion', () => {
    const { goalVerificationFromEnvelope } = require('../goalVerificationWire');
    const gv = goalVerificationFromEnvelope({
      goal_verification: {},
      workflow_completion: {
        goal_verification: { verified: false, pending: ['primary_public_url'] },
      },
    });
    expect(gv?.pending).toEqual(['primary_public_url']);
  });
});

describe('mergeExecuteEnvelopeIntoPacket', () => {
  it('merges partial_success and workflow_diagnostics onto packet', () => {
    const { mergeExecuteEnvelopeIntoPacket } = require('../execute');
    const out = mergeExecuteEnvelopeIntoPacket(
      { state: 'actionable' },
      {
        partial_success: true,
        workflow_diagnostics: [{ code: 'work_next_hydrate_failed' }],
        workflow_run_id: 'run-1',
      },
    );
    expect(out.partial_success).toBe(true);
    expect(out.workflow_diagnostics).toHaveLength(1);
    expect(out.workflow_run_id).toBe('run-1');
  });

  it('hoists next_actions from batch onto packet', () => {
    const { mergeExecuteEnvelopeIntoPacket } = require('../execute');
    const out = mergeExecuteEnvelopeIntoPacket(
      { state: 'blocked' },
      { next_actions: ['agents.plan_claim'] },
    );
    expect(out.next_actions).toEqual(['agents.plan_claim']);
  });
});

describe('normalizeWorkflowStatus', () => {
  it('maps partial_success to partial', () => {
    const { normalizeWorkflowStatus } = require('../execute');
    expect(normalizeWorkflowStatus('partial_success', true)).toBe('partial');
    expect(normalizeWorkflowStatus('completed', false)).toBe('completed');
  });
});

describe('mcpExecute semantic anchor', () => {
  it('does not inject execution_intent for script.put validate_only', async () => {
    const calls: unknown[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({ result: { results: [{ id: 'step_0', ok: true }] } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;
    try {
      await mcpExecute(
        [
          {
            action: 'script.put',
            params: { script_id: 'qa', files: [], validate_only: true },
          },
        ],
        { mcpUrl: 'https://agentstack.tech/mcp', token: 'tok', projectId: 2196 },
      );
      const body = calls[0] as {
        params?: { arguments?: { options?: { execution_intent?: string } } };
      };
      expect(body.params?.arguments?.options?.execution_intent).toBeUndefined();
    } finally {
      globalThis.fetch = original;
    }
  });

  it('injects execution_intent direct for persistent script.put', async () => {
    const calls: unknown[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({ result: { results: [{ id: 'step_0', ok: true }] } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;
    try {
      await mcpExecute(
        [
          {
            action: 'script.put',
            params: { script_id: 'qa', files: [], validate_only: false },
          },
        ],
        { mcpUrl: 'https://agentstack.tech/mcp', token: 'tok', projectId: 2196 },
      );
      const body = calls[0] as {
        params?: { arguments?: { options?: { execution_intent?: string } } };
      };
      expect(body.params?.arguments?.options?.execution_intent).toBe('direct');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('omits X-Project-ID when projectId unset', async () => {
    const headers: Record<string, string>[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      headers.push(init?.headers as Record<string, string>);
      return new Response(
        JSON.stringify({ result: { results: [{ id: 'step_0', ok: true }] } }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      await mcpExecute([{ action: 'discovery.list', params: {} }], {
        mcpUrl: 'https://agentstack.tech/mcp',
        token: 'tok',
      });
      expect(headers[0]?.['X-Project-ID']).toBeUndefined();
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('ensureBatchSemanticAnchor', () => {
  it('sets executionIntent direct for stale bulk_delete alias', () => {
    const { ensureBatchSemanticAnchor } = require('../execute');
    const out = ensureBatchSemanticAnchor(
      [{ action: 'hosting.bucket.bulk_delete', params: { prefix: 'tmp/' } }],
      { mcpUrl: 'https://agentstack.tech/mcp', token: 'tok', projectId: 1 },
    );
    expect(out.executionIntent).toBe('direct');
  });

  it('sets executionIntent direct for single-step bulk_delete without goal', () => {
    const { ensureBatchSemanticAnchor } = require('../execute');
    const out = ensureBatchSemanticAnchor(
      [{ action: 'hosting.bucket.files.bulk_delete', params: { prefix: 'tmp/' } }],
      { mcpUrl: 'https://agentstack.tech/mcp', token: 'tok', projectId: 1 },
    );
    expect(out.executionIntent).toBe('direct');
  });

  it('sets executionIntent direct for work_next claim=true', () => {
    const { ensureBatchSemanticAnchor } = require('../execute');
    const out = ensureBatchSemanticAnchor(
      [{ action: 'agents.work_next', params: { claim: true } }],
      { mcpUrl: 'https://agentstack.tech/mcp', token: 'tok', projectId: 1 },
    );
    expect(out.executionIntent).toBe('direct');
  });

  it('leaves options unchanged when goal already set', () => {
    const { ensureBatchSemanticAnchor } = require('../execute');
    const out = ensureBatchSemanticAnchor(
      [{ action: 'hosting.bucket.files.bulk_delete', params: {} }],
      {
        mcpUrl: 'https://agentstack.tech/mcp',
        token: 'tok',
        projectId: 1,
        goal: 'archive old assets',
      },
    );
    expect(out.executionIntent).toBeUndefined();
    expect(out.goal).toBe('archive old assets');
  });
});

describe('extractResults tools/call handoff', () => {
  it('reads job status from structuredContent when results are absent', () => {
    const rows = extractResults({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              data: { job_id: 'mcp-1', status: 'queued' },
            }),
          },
        ],
        structuredContent: {
          ok: true,
          data: { job_id: 'mcp-1', status: 'completed', steps: [{ data: { reply: 'hi' } }] },
        },
        isError: false,
      },
    });
    expect(rows).toHaveLength(1);
    expect((rows[0].data as { status: string }).status).toBe('completed');
  });

  it('reads structuredContent when the text body has no data', () => {
    const rows = extractResults({
      result: {
        content: [{ type: 'text', text: 'not-json' }],
        structuredContent: {
          ok: true,
          data: { job_id: 'mcp-2', status: 'completed' },
        },
      },
    });
    expect((rows[0].data as { job_id: string }).job_id).toBe('mcp-2');
  });
});

describe('extractBatchMeta', () => {
  it('hoists goal_verification from workflow_completion', () => {
    const meta = extractBatchMeta({
      ok: true,
      workflow_completion: {
        advanced: false,
        receipt_recorded: true,
        goal_verification: { verified: false, pending: ['primary_public_url'] },
      },
    });
    expect(meta.goal_verification?.pending).toEqual(['primary_public_url']);
    expect(meta.workflow_completion?.receipt_recorded).toBe(true);
  });
});
