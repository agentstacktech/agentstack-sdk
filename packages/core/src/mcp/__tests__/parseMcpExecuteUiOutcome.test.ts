import { describe, expect, it } from 'vitest';

import {
  extractFirstMcpStepPayload,
  parseMcpExecuteUiOutcome,
} from '../parseMcpExecuteUiOutcome';

describe('parseMcpExecuteUiOutcome', () => {
  it('marks success when ok=true', () => {
    const outcome = parseMcpExecuteUiOutcome({ ok: true, steps: [] });
    expect(outcome.state).toBe('success');
    expect(outcome.partialSuccess).toBe(false);
  });

  it('marks partial_success with recovery hint', () => {
    const outcome = parseMcpExecuteUiOutcome({
      partial_success: true,
      succeeded_count: 1,
      suggestions: ['Retry with mcp_read cap'],
    });
    expect(outcome.state).toBe('partial_success');
    expect(outcome.recoveryHint).toContain('mcp_read');
  });

  it('prefers RU recovery hint and when_blocked pin', () => {
    const outcome = parseMcpExecuteUiOutcome({
      ok: false,
      error_code: 'auth_required',
      error: { recovery_hint_ru: 'Сначала войдите' },
      instruction_slice: { when_blocked: { auth_required: 'Connect MCP' } },
    });
    expect(outcome.recoveryHint).toBe('Сначала войдите');
    const pinned = parseMcpExecuteUiOutcome({
      ok: false,
      error_code: 'auth_required',
      instruction_slice: { when_blocked: { auth_required: 'Connect MCP' } },
    });
    expect(pinned.recoveryHint).toBe('Connect MCP');
  });

  it('extracts first step payload', () => {
    const data = extractFirstMcpStepPayload({
      steps: [{ result: { data: { job_id: 'j1' } } }],
    });
    expect(data).toEqual({ job_id: 'j1' });
  });
});