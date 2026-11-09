import { describe, expect, it, vi } from 'vitest';

import {
  StackscriptMcpError,
  createStackScriptClient,
  isStackscriptMcpError,
  getStackscriptWriteSet,
  parseStackscriptMcpEnvelope,
  parseStackscriptMcpFailure,
} from '../client';

describe('StackscriptMcpError', () => {
  it('isStackscriptMcpError detects class instances', () => {
    const err = new StackscriptMcpError('export_not_found:sum', { export_names: ['sum'] });
    expect(isStackscriptMcpError(err)).toBe(true);
    expect(isStackscriptMcpError(new Error('x'))).toBe(false);
    expect(err.data.export_names).toEqual(['sum']);
  });

  it('parseStackscriptMcpEnvelope merges nested data and write_set (E19)', () => {
    const env = parseStackscriptMcpEnvelope({
      ok: true,
      data: {
        value: 1,
        write_set: [{ path: ['a', 'b'], value: 7 }],
        dry_run: true,
      },
    });
    expect(env?.value).toBe(1);
    expect(getStackscriptWriteSet({ data: env })).toEqual([{ path: ['a', 'b'], value: 7 }]);
  });

  it('parseStackscriptMcpFailure unwraps class and raw envelopes', () => {
    const err = new StackscriptMcpError('x', { error: 'script_test_failed' });
    expect(parseStackscriptMcpFailure(err)?.error).toBe('script_test_failed');
    expect(parseStackscriptMcpFailure({ data: { hint: 'fix body' } })?.hint).toBe('fix body');
    expect(parseStackscriptMcpFailure(new Error('nope'))).toBeNull();
  });

  it('parseStackscriptMcpFailure merges instruction_slice when_blocked', () => {
    const row = parseStackscriptMcpFailure({
      data: {
        error: 'export_not_found',
        instruction_slice: {
          when_blocked: { export_not_found: 'Use export_names from script.get' },
        },
      },
    });
    expect(row?.when_blocked).toEqual({
      export_not_found: 'Use export_names from script.get',
    });
  });
});

describe('createStackScriptClient postStep', () => {
  it('throws StackscriptMcpError with hint and payload on MCP success=false', async () => {
    const http = {
      post: vi.fn().mockResolvedValue({
        success: false,
        data: {
          error: 'export_not_found:sum',
          hint: 'Use export_names from script.get',
          data: { export_names: ['ping', 'sum'] },
        },
      }),
    };
    const client = createStackScriptClient(http as never, 1997);
    await expect(client.dryRun({ script_id: 'probe', export: 'sum' })).rejects.toMatchObject({
      name: 'StackscriptMcpError',
      message: 'Use export_names from script.get',
    });
    try {
      await client.dryRun({ script_id: 'probe', export: 'sum' });
    } catch (e) {
      expect(isStackscriptMcpError(e)).toBe(true);
      if (isStackscriptMcpError(e)) {
        expect(e.data.export_names).toEqual(['ping', 'sum']);
      }
    }
  });

  it('preserves capability_result on MCP success=false', async () => {
    const http = {
      post: vi.fn().mockResolvedValue({
        success: false,
        capability_result: { cost: { fuel: 12 } },
        data: {
          error: 'script_dry_run_failed',
          hint: 'fix input',
        },
      }),
    };
    const client = createStackScriptClient(http as never, 2196);
    try {
      await client.dryRun({ script_id: 's', export: 'fn' });
    } catch (e) {
      expect(isStackscriptMcpError(e)).toBe(true);
      if (isStackscriptMcpError(e)) {
        expect(e.data.capability_result).toEqual({ cost: { fuel: 12 } });
      }
    }
  });

  it('postStep success returns merged envelope with write_set (E19)', async () => {
    const http = {
      post: vi.fn().mockResolvedValue({
        success: true,
        data: {
          ok: true,
          dry_run: true,
          fuel_used: 3,
          data: { value: 7 },
          write_set: [{ path: ['a'], value: 1 }],
        },
      }),
    };
    const client = createStackScriptClient(http as never, 1);
    const out = await client.dryRun({ script_id: 's', export: 'fn' });
    expect((out as { value?: number }).value).toBe(7);
    expect((out as { write_set?: unknown[] }).write_set).toHaveLength(1);
  });

  it('script.run omits sandbox env from MCP context and headers', async () => {
    const http = {
      post: vi.fn().mockResolvedValue({
        success: true,
        data: { data: { ok: true } },
      }),
    };
    const client = createStackScriptClient(http as never, 1997, {
      generationEnvUuid: 'anchor-uuid',
    });
    await client.run({ script_id: 'thermo', export: 'tick', input: {} });
    expect(http.post).toHaveBeenCalledWith(
      '/mcp',
      {
        action: 'script.run',
        params: expect.objectContaining({ script_id: 'thermo', export: 'tick' }),
        context: { project_id: 1997 },
      },
      undefined,
    );
  });

  it('sends X-AgentStack-Env when generationEnvUuid is set', async () => {
    const http = {
      post: vi.fn().mockResolvedValue({
        success: true,
        data: { data: { ok: true } },
      }),
    };
    const client = createStackScriptClient(http as never, 1, {
      generationEnvUuid: 'anchor-uuid',
    });
    await client.list();
    expect(http.post).toHaveBeenCalledWith(
      '/mcp',
      expect.objectContaining({ context: expect.objectContaining({ generation_env_uuid: 'anchor-uuid' }) }),
      { headers: { 'X-AgentStack-Env': 'anchor-uuid' } },
    );
  });
});
