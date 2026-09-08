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

  it('accepts post_execute question with afterNodeId', () => {
    const result = validateGuidanceDefinition({
      id: 'crm-first',
      version: 1,
      titleDefault: 'CRM',
      intentPatterns: [],
      intentKeywords: [],
      audienceMask: { dev: true, user: true },
      entryNodeId: 't_contact',
      executionRules: [
        { when: {}, steps: ['t_contact', 'v_contact'] },
        { when: { createDeal: 'yes' }, steps: ['t_deal'] },
      ],
      nodes: {
        t_contact: {
          kind: 'capability',
          id: 't_contact',
          titleDefault: 'Contact',
          taskId: 'crm.add_contact',
          surface: 'inline',
        },
        v_contact: {
          kind: 'verify',
          id: 'v_contact',
          titleDefault: 'Verify',
          verify: { kind: 'crmContactExists', minCount: 1 },
        },
        q_deal: {
          kind: 'question',
          id: 'q_deal',
          phase: 'post_execute',
          afterNodeId: 'v_contact',
          promptDefault: 'Deal?',
          input: 'chips',
          options: [{ id: 'yes', labelDefault: 'Yes', next: 't_deal', set: { createDeal: 'yes' } }],
        },
        t_deal: {
          kind: 'capability',
          id: 't_deal',
          titleDefault: 'Deal',
          taskId: 'crm.create_deal',
          surface: 'inline',
        },
        outcome: { kind: 'outcome', id: 'outcome', messageDefault: 'Done' },
      },
    });
    expect(result.ok).toBe(true);
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
