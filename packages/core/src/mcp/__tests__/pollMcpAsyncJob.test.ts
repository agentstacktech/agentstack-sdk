import { describe, expect, it, vi } from 'vitest';

import {
  extractMcpAsyncJobId,
  pollMcpAsyncJobUntilTerminal,
  unwrapMcpJobStatusRecord,
} from '../pollMcpAsyncJob';

describe('pollMcpAsyncJob', () => {
  it('extracts job_id from nested data', () => {
    expect(extractMcpAsyncJobId({ data: { job_id: 'abc' } })).toBe('abc');
  });

  it('unwraps durable job under data shell', () => {
    const inner = { job_id: 'j', status: 'working', steps: [] };
    const row = unwrapMcpJobStatusRecord({ ok: true, data: inner, status: 'completed' });
    expect(row).toBe(inner);
  });

  it('polls until terminal status', async () => {
    const client = vi
      .fn()
      .mockResolvedValueOnce({ status: 'working', job_id: 'j1' })
      .mockResolvedValueOnce({ status: 'completed', job_id: 'j1', steps: [] });
    const terminal = await pollMcpAsyncJobUntilTerminal({
      client,
      jobId: 'j1',
      intervalMs: 1,
      maxAttempts: 5,
    });
    expect(terminal.status).toBe('completed');
    expect(client).toHaveBeenCalledTimes(2);
  });
});