import type { LedgerClient } from './LedgerClient';

export class VaultClient {
  constructor(private readonly ledger: LedgerClient) {}

  getNav = this.ledger.getVaultNav.bind(this.ledger);
  confirmDeposit = this.ledger.confirmVaultDeposit.bind(this.ledger);
}
