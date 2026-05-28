import { EconomyError } from '../errors/EconomyError';
import type { LedgerClient } from './LedgerClient';

export class FundingClient {
  constructor(private readonly ledger: LedgerClient) {}

  getOffer = this.ledger.getFundingOffer.bind(this.ledger);
  startVaultDeposit = this.ledger.startVaultDepositFromPayment.bind(this.ledger);
  getTransparency = this.ledger.getFundingTransparency.bind(this.ledger);

  async fundFromPayment(
    projectId: number,
    paymentId: string,
    walletAddress: string,
  ): Promise<Record<string, unknown>> {
    const offer = await this.getOffer(projectId, paymentId);
    const eligible = offer.eligible === true || offer.eligible === 'true';
    if (!eligible) {
      throw new EconomyError(
        'FUNDING_NOT_OFFERED',
        String(offer.reason ?? 'Funding not offered for this payment'),
        { offer },
      );
    }
    return this.startVaultDeposit(projectId, {
      payment_id: paymentId,
      wallet_address: walletAddress,
    });
  }
}
