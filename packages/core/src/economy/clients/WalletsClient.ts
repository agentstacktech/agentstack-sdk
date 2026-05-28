import type { LedgerClient } from './LedgerClient';

export class WalletsClient {
  constructor(private readonly ledger: LedgerClient) {}

  register = this.ledger.registerWallet.bind(this.ledger);
}
