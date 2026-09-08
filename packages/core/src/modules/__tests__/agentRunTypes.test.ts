import {
  approvalArtifactHashFromDetail,
  approvalArtifactHashFromRunRow,
  isTerminalRunStatus,
  runStatusFromGetRunPayload,
} from '../agentRunTypes';

describe('agentRunTypes', () => {
  it('extracts status from get_run payload', () => {
    expect(runStatusFromGetRunPayload({ run_detail: { status: 'running' } })).toBe('running');
    expect(
      runStatusFromGetRunPayload({
        run: { agent_run_spec: { status: 'waiting_for_approval' } },
      }),
    ).toBe('waiting_for_approval');
  });

  it('detects terminal statuses', () => {
    expect(isTerminalRunStatus('completed')).toBe(true);
    expect(isTerminalRunStatus('running')).toBe(false);
  });

  it('reads approval hash from detail or row', () => {
    expect(approvalArtifactHashFromDetail({ approval_artifact_hash: 'h1' })).toBe('h1');
    expect(
      approvalArtifactHashFromRunRow({
        agent_run_spec: { approval_artifact_hash: 'h2' },
      }),
    ).toBe('h2');
  });
});
