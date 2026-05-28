import type { HTTPClient } from '../client/http-client';
import { FinancePortfolioClient } from './FinancePortfolioClient';
import { ProjectFinanceClient } from './ProjectFinanceClient';
import { SwapSession } from './sessions/SwapSession';

export class AgentFinanceFacade {
  readonly portfolio: FinancePortfolioClient;
  readonly project: ProjectFinanceClient;

  constructor(private readonly http: HTTPClient) {
    this.portfolio = new FinancePortfolioClient(http);
    this.project = new ProjectFinanceClient(http);
  }

  swap(projectId: number): SwapSession {
    return new SwapSession(this.http, projectId);
  }
}
