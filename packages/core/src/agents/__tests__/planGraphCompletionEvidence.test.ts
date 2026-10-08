import { describe, expect, it } from 'vitest';

import {
  extractPlanCompletionFromRun,
  parsePlanCompletionEvidence,
} from '../planGraph';

describe('parsePlanCompletionEvidence', () => {
  it('returns null for invalid shapes', () => {
    expect(parsePlanCompletionEvidence(null)).toBeNull();
    expect(parsePlanCompletionEvidence({ status: 'blocked' })).toBeNull();
  });

  it('parses missing and predicate keys', () => {
    const row = parsePlanCompletionEvidence({
      allowed: false,
      status: 'blocked',
      missing_evidence: ['build_ok'],
      predicates_missing: ['build_ok'],
      next_action: 'collect_evidence',
    });
    expect(row).toMatchObject({
      allowed: false,
      status: 'blocked',
      missing_evidence: ['build_ok'],
      predicates_missing: ['build_ok'],
      next_action: 'collect_evidence',
    });
  });
});

describe('extractPlanCompletionFromRun', () => {
  it('reads top-level plan_completion', () => {
    const env = extractPlanCompletionFromRun({
      plan_completion: { allowed: true, status: 'passed', predicates_satisfied: ['gates_passed'] },
    });
    expect(env?.allowed).toBe(true);
    expect(env?.predicates_satisfied).toContain('gates_passed');
  });

  it('reads nested orchestration.evidence.plan_completion', () => {
    const env = extractPlanCompletionFromRun({
      agent_run_spec: {
        orchestration: {
          evidence: {
            plan_completion: { allowed: false, missing_evidence: ['browser_verify'] },
          },
        },
      },
    });
    expect(env?.missing_evidence).toContain('browser_verify');
  });
});
