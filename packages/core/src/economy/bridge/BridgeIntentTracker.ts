export type BridgePhase = 'created' | 'submitted' | 'finalized' | 'failed';

export interface BridgeIntentRow {
  id?: number;
  status?: string;
  [key: string]: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BridgeIntentTracker {
  constructor(
    private readonly listIntents: (
      projectId: number,
      params?: { limit?: number },
    ) => Promise<{ intents: BridgeIntentRow[] }>,
  ) {}

  async pollUntil(
    projectId: number,
    intentId: number,
    predicate: (intent: BridgeIntentRow) => boolean,
    opts?: { intervalMs?: number; timeoutMs?: number },
  ): Promise<BridgeIntentRow> {
    const intervalMs = opts?.intervalMs ?? 2000;
    const timeoutMs = opts?.timeoutMs ?? 120_000;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const { intents } = await this.listIntents(projectId, { limit: 100 });
      const row = intents.find((i) => Number(i.id) === intentId);
      if (row && predicate(row)) {
        return row;
      }
      await sleep(intervalMs);
    }
    throw new Error(`Bridge intent ${intentId} poll timeout`);
  }
}
