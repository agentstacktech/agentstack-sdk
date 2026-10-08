import {
  parseWorkNextPacket,
  primaryWorkGraphAction,
  runWorkGraphLoop,
} from '../planGraph';

describe('parseWorkNextPacket compact', () => {
  it('parses compact loop projection fields', () => {
    const packet = parseWorkNextPacket({
      detail: 'compact',
      state: 'actionable',
      project_id: 42,
      node_id: 'leaf-9',
      revision: 7,
      reason: 'provision_required',
      next_action: { action: 'agents.ensure_agent', params: { node_id: 'leaf-9' } },
      viewer_urls: {
        dev: '/dev/projects/42/work-graph?focus_node_id=leaf-9',
        user: '/user/projects/42/work-graph?focus_node_id=leaf-9',
      },
    });
    expect(packet.detail).toBe('compact');
    expect(packet.project_id).toBe(42);
    expect(packet.node_id).toBe('leaf-9');
    expect(packet.revision).toBe(7);
    expect(packet.reason).toBe('provision_required');
    expect(packet.state).toBe('actionable');
    expect(packet.next_work?.node_id).toBe('leaf-9');
    expect(packet.viewer_urls?.dev).toContain('focus_node_id=leaf-9');
    expect(primaryWorkGraphAction(packet)?.action).toBe('agents.ensure_agent');
  });

  it('parses full packet planning projections', () => {
    const packet = parseWorkNextPacket({
      state: 'blocked',
      project_id: 1,
      planning_required: [{ node_id: 'plan-1', blocked_reason: 'planning_required' }],
      planning_artifacts: [{ node_id: 'art-1', planning_artifact: true }],
    });
    expect(packet.planning_required?.[0]?.node_id).toBe('plan-1');
    expect(packet.planning_artifacts?.[0]?.node_id).toBe('art-1');
  });
});

describe('runWorkGraphLoop', () => {
  const fleet = () => {
    const workNext = jest.fn().mockResolvedValue({ state: 'idle' });
    return {
      workNext,
      workStatus: jest.fn().mockResolvedValue({ state: 'actionable' }),
      claimPlanNodes: jest.fn().mockResolvedValue({}),
      planExecute: jest.fn().mockResolvedValue({}),
      ensureAgent: jest.fn().mockResolvedValue({}),
      planRecoveryScan: jest.fn().mockResolvedValue({}),
    };
  };

  it('stops at idle and returns the last packet', async () => {
    const api = fleet();
    api.workNext.mockResolvedValueOnce({
      detail: 'compact',
      state: 'actionable',
      project_id: 5,
      next_action: { action: 'agents.plan_claim', params: { node_id: 'n1' } },
    });
    api.workNext.mockResolvedValueOnce({ detail: 'compact', state: 'idle', project_id: 5 });

    const finalPacket = await runWorkGraphLoop(api, 5, { maxIterations: 5 });
    expect(api.claimPlanNodes).toHaveBeenCalled();
    expect(finalPacket.state).toBe('idle');
  });

  it('invokes onPacket before each loop step', async () => {
    const api = fleet();
    api.workNext
      .mockResolvedValueOnce({
        state: 'executable',
        next_action: { action: 'agents.plan_claim', params: { node_id: 'n1' } },
      })
      .mockResolvedValueOnce({ state: 'idle' });
    const seen: string[] = [];
    await runWorkGraphLoop(api, 2, {
      maxIterations: 3,
      onPacket: (p) => seen.push(String(p.state ?? '')),
    });
    expect(seen).toEqual(['executable']);
    expect(api.claimPlanNodes).toHaveBeenCalled();
  });
});
