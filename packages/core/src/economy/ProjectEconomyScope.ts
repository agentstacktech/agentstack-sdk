import type { AgentsFleet } from '../modules/AgentsFleet';
import type { AgentEconomyFacade } from './AgentEconomyFacade';
import { BillingSession } from './sessions/BillingSession';
import { PaidAgentRunFlow } from './sessions/PaidAgentRunFlow';

export class ProjectLedgerScope {
  constructor(
    private readonly projectId: number,
    private readonly facade: AgentEconomyFacade,
  ) {}

  getBalance(accountKey: string, assetCode?: string) {
    return this.facade.ledger.getBalance(this.projectId, { accountKey, assetCode });
  }

  async ensureBalance(accountKey: string, minAtomic: bigint, assetCode = 'AGNT'): Promise<void> {
    const bal = await this.getBalance(accountKey, assetCode);
    if (BigInt(bal.balance_atomic) < minAtomic) {
      const { EconomyError } = await import('./errors/EconomyError');
      throw new EconomyError(
        'INSUFFICIENT_AGNT',
        `balance ${bal.balance_atomic} < required ${minAtomic}`,
        { accountKey, assetCode },
      );
    }
  }
}

export class ProjectEconomyScope {
  readonly ledger: ProjectLedgerScope;

  constructor(
    private readonly projectId: number,
    private readonly facade: AgentEconomyFacade,
    private readonly agentsFleet: AgentsFleet,
  ) {
    this.ledger = new ProjectLedgerScope(projectId, facade);
  }

  billing(buyerUserId: number): BillingSession {
    return new BillingSession(this.projectId, this.facade.credits, buyerUserId);
  }

  paidRun(buyerUserId: number): PaidAgentRunFlow {
    return new PaidAgentRunFlow(
      this.projectId,
      this.agentsFleet,
      this.billing(buyerUserId),
    );
  }
}
