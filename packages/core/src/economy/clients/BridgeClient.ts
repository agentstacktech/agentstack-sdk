import type { LedgerClient } from './LedgerClient';

export class BridgeClient {
  constructor(private readonly ledger: LedgerClient) {}

  listIntents = this.ledger.listBridgeIntents.bind(this.ledger);
  listEvents = this.ledger.listBridgeEvents.bind(this.ledger);
  getSupplySnapshot = this.ledger.getBridgeSupplySnapshot.bind(this.ledger);
  createIntent = this.ledger.createBridgeIntent.bind(this.ledger);
  finalizeIn = this.ledger.finalizeBridgeIn.bind(this.ledger);
  finalizeOut = this.ledger.finalizeBridgeOut.bind(this.ledger);
}
