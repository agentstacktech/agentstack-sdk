import { describe, expect, it } from 'vitest';
import { pickDiscoveryNextStep } from '../discoveryClient';

describe('pickDiscoveryNextStep', () => {
  it('prefers recommended_actions over catalog actions[0]', () => {
    const step = pickDiscoveryNextStep({
      actions: [{ action: 'discovery.list' }],
      recommended_actions: [{ action: 'discovery.search', reason: 'workflow' }],
    });
    expect(step?.action).toBe('discovery.search');
  });

  it('uses workflow slot when recommended_actions empty', () => {
    const step = pickDiscoveryNextStep({
      selected_workflow: { slots: { step_actions: ['agents.plan_propose'] } },
      actions: [{ action: 'discovery.list' }],
    });
    expect(step?.action).toBe('agents.plan_propose');
  });

  it('returns null when no workflow signal', () => {
    expect(pickDiscoveryNextStep({ actions: [{ action: 'discovery.list' }] })).toBeNull();
  });
});
