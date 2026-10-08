import { parsePlanClaimPreview } from '../planGraph';

describe('parsePlanClaimPreview', () => {
  it('returns undefined for nullish and scalars', () => {
    expect(parsePlanClaimPreview(null)).toBeUndefined();
    expect(parsePlanClaimPreview(undefined)).toBeUndefined();
    expect(parsePlanClaimPreview('wip_full')).toBeUndefined();
  });

  it('parses claimable rows with trimmed ids and why_now', () => {
    const preview = parsePlanClaimPreview({
      max_wip: 3,
      wip_room: 1,
      wip_full: false,
      in_progress_project: 2,
      claimable: [
        {
          id: ' task-1 ',
          title: 'Ship API',
          suggested_agent_id: ' agent-a ',
          why_now: ' highest score ',
          priority_class: 'p0',
          template_available: ' tpl-backend ',
          eligibility: {
            eligible: true,
            reasons: ['ready', ''],
            blocked_by: [],
            dependency_ready: true,
            execution_ready: true,
          },
        },
        { title: 'no id' },
      ],
      claimable_count: 1,
      blocked_sample: [
        {
          id: ' blocked-1 ',
          title: 'Blocked task',
          reasons: ['no_compatible_agent', ''],
          blocked_by: ['feat-1'],
        },
      ],
      active_goal_id: ' goal-1 ',
    });
    expect(preview).toMatchObject({
      max_wip: 3,
      wip_room: 1,
      wip_full: false,
      in_progress_project: 2,
      claimable_count: 1,
      active_goal_id: 'goal-1',
    });
    expect(preview?.claimable).toHaveLength(1);
    expect(preview?.claimable[0]).toMatchObject({
      id: 'task-1',
      title: 'Ship API',
      suggested_agent_id: 'agent-a',
      why_now: 'highest score',
      priority_class: 'p0',
      template_available: 'tpl-backend',
      eligibility: {
        eligible: true,
        reasons: ['ready'],
        blocked_by: [],
        dependency_ready: true,
        execution_ready: true,
      },
    });
    expect(preview?.blocked_sample).toHaveLength(1);
    expect(preview?.blocked_sample?.[0]).toMatchObject({
      id: 'blocked-1',
      title: 'Blocked task',
      reasons: ['no_compatible_agent'],
      blocked_by: ['feat-1'],
    });
  });
});
