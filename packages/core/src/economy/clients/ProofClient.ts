import type { LedgerClient } from './LedgerClient';

export class ProofClient {
  constructor(private readonly ledger: LedgerClient) {}

  getBatchProof = this.ledger.getBatchProof.bind(this.ledger);
  verifyReceipt = this.ledger.verifyReceipt.bind(this.ledger);
  getEvidenceReceipt = this.ledger.getEvidenceReceipt.bind(this.ledger);
  publishPendingCheckpoints = this.ledger.publishPendingCheckpoints.bind(this.ledger);
  getCheckpointCoveringBatch = this.ledger.getCheckpointCoveringBatch.bind(this.ledger);
  listRecentCheckpoints = this.ledger.listRecentCheckpoints.bind(this.ledger);
  getCheckpointByEpoch = this.ledger.getCheckpointByEpoch.bind(this.ledger);
  proofToTask = this.ledger.proofToTask.bind(this.ledger);
}
