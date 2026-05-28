import type { HTTPClient } from '../client/http-client';
import type { AgentsFleet } from '../modules/AgentsFleet';
import { AGENTNET_NATIVE, AGENTNET_NETWORK, AGENTNET_STABLE } from './agentnetIdentity';
import { BridgeIntentTracker } from './bridge/BridgeIntentTracker';
import { BridgeClient } from './clients/BridgeClient';
import { ComputeCreditsClient } from './clients/ComputeCreditsClient';
import { FundingClient } from './clients/FundingClient';
import { LedgerClient } from './clients/LedgerClient';
import { ProofClient } from './clients/ProofClient';
import { VaultClient } from './clients/VaultClient';
import { WalletsClient } from './clients/WalletsClient';
import { ProjectEconomyScope } from './ProjectEconomyScope';
import { WorkingSetClient } from './workingSet/WorkingSetClient';

/**
 * Tenant / project-scoped AgentNet economy (`/api/agentnet/{project_id}/*` only).
 * Platform operator routes (`/api/admin/agentnet/*`) live on {@link AgentAdmin} (`sdk.admin`), not here.
 */
export class AgentEconomyFacade {
  readonly ledger: LedgerClient;
  readonly credits: ComputeCreditsClient;
  readonly bridge: BridgeClient;
  readonly vault: VaultClient;
  readonly funding: FundingClient;
  readonly proofs: ProofClient;
  readonly wallets: WalletsClient;
  readonly workingSet: WorkingSetClient;
  readonly bridgeTracker: BridgeIntentTracker;

  readonly constants = {
    network: AGENTNET_NETWORK,
    native: AGENTNET_NATIVE,
    stable: AGENTNET_STABLE,
  } as const;

  readonly explorer = {
    url: (chainId: number, kind: 'address' | 'tx', value: string) =>
      this.ledger.buildExplorerUrl(chainId, kind, value),
  };

  constructor(
    http: HTTPClient,
    private readonly agentsFleet: AgentsFleet,
  ) {
    this.ledger = new LedgerClient(http);
    this.credits = new ComputeCreditsClient(this.ledger);
    this.bridge = new BridgeClient(this.ledger);
    this.vault = new VaultClient(this.ledger);
    this.funding = new FundingClient(this.ledger);
    this.proofs = new ProofClient(this.ledger);
    this.wallets = new WalletsClient(this.ledger);
    this.workingSet = new WorkingSetClient(http);
    this.bridgeTracker = new BridgeIntentTracker((pid, p) =>
      this.bridge.listIntents(pid, p).then((r) => ({ intents: r.intents })),
    );
  }

  forProject(projectId: number): ProjectEconomyScope {
    return new ProjectEconomyScope(projectId, this, this.agentsFleet);
  }
}
