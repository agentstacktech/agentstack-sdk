/**
 * Git journal ship helpers — poll + receipt parse (sdk.hosting.gen2).
 */
import {
  pollBuildUntilTerminal,
  type BuildStatusPollResult,
  type ExecuteMcp,
  type PollBuildOptions,
} from './pollBuildUntilTerminal';
import { parseJournalBuildReceipt, type JournalBuildReceipt } from './journalBuildReceipt';

export type JournalShipClient = {
  projectId: number;
  execute: ExecuteMcp;
  bucketName?: string;
  bucketId?: string;
};

export async function pollPreviewUntilReady(
  execute: ExecuteMcp,
  jobId: string,
  options?: Partial<Omit<PollBuildOptions, 'jobId' | 'execute'>>,
): Promise<BuildStatusPollResult & { receipt: JournalBuildReceipt }> {
  const terminal = await pollBuildUntilTerminal({
    jobId,
    execute,
    initialDelayMs: options?.initialDelayMs ?? 2_000,
    maxDelayMs: options?.maxDelayMs ?? 30_000,
    timeoutMs: options?.timeoutMs,
    onPoll: options?.onPoll,
  });
  return {
    ...terminal,
    receipt: parseJournalBuildReceipt(terminal.body),
  };
}

/** Read hosting plane + workspace meta before journal edits. */
export async function readJournalShipPlane(
  client: JournalShipClient,
): Promise<Record<string, unknown>> {
  return client.execute('hosting.project.status', {
    project_id: client.projectId,
    include_workspace_meta: true,
    ...(client.bucketId ? { bucket_id: client.bucketId } : {}),
    ...(client.bucketName ? { bucket_name: client.bucketName } : {}),
  });
}