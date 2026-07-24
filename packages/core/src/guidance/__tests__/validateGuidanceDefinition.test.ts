import { describe, expect, it } from 'vitest';

import { validateGuidanceDefinition } from '../validateDefinition';

describe('validateGuidanceDefinition', () => {
  it('round-trips a minimal tenant playbook with free-form slug id', () => {
    const raw = {
      id: 'tenant-onboarding',
      version: 1,
      titleDefault: 'Workspace onboarding',
      intentPatterns: [],
      intentKeywords: ['onboard'],
      audienceMask: { dev: true, user: true },
      entryNodeId: 'q_welcome',
      nodes: {
        q_welcome: {
          kind: 'question',
          id: 'q_welcome',
          promptDefault: 'Ready to start?',
          input: 'single_choice',
          options: [{ id: 'yes', labelDefault: 'Yes', next: 'v_done' }],
        },
        v_done: {
          kind: 'verify',
          id: 'v_done',
          titleDefault: 'Confirm setup',
          verify: { kind: 'manualConfirm', checklistKeys: ['ready'] },
        },
        o_done: {
          kind: 'outcome',
          id: 'o_done',
          messageDefault: 'You are set',
        },
      },
      defaultExecutionSteps: ['v_done'],
    };

    const result = validateGuidanceDefinition(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.playbook.id).toBe('tenant-onboarding');
    expect(result.playbook.entryNodeId).toBe('q_welcome');
    expect(Object.keys(result.playbook.nodes)).toEqual(
      expect.arrayContaining(['q_welcome', 'v_done', 'o_done']),
    );
  });

  it('rejects capability nodes missing taskId and fabricCapabilityId', () => {
    const result = validateGuidanceDefinition({
      id: 'bad-cap',
      version: 1,
      titleDefault: 'Bad',
      intentPatterns: [],
      intentKeywords: [],
      audienceMask: { dev: true },
      entryNodeId: 'c1',
      nodes: {
        c1: {
          kind: 'capability',
          id: 'c1',
          titleDefault: 'Do something',
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('capability'))).toBe(true);
  });
});
