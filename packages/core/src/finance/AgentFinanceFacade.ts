import type { HTTPClient } from '../client/http-client';
import { FinancePortfolioClient } from './FinancePortfolioClient';
import { PayClient } from './pay/PayClient';
import { ProjectFinanceClient } from './ProjectFinanceClient';
import { SwapSession } from './sessions/SwapSession';

export class AgentFinanceFacade {
  readonly portfolio: FinancePortfolioClient;
  readonly project: ProjectFinanceClient;
  readonly pay: PayClient;

  constructor(private readonly http: HTTPClient) {
    this.portfolio = new FinancePortfolioClient(http);
    this.project = new ProjectFinanceClient(http);
    this.pay = new PayClient(http);
  }

  swap(projectId: number): SwapSession {
    return new SwapSession(this.http, projectId);
  }
}
