/**
 * CRM AI autofill client — genetic: ``sdk.crm.ai.gen1``.
 *
 * Thin wrapper over ``AgentCrm`` AI endpoints (plan → apply stays on ``AgentCrm``).
 */

import type { AgentCrm } from './AgentCrm';

export class CrmAiClient {
  constructor(private crm: AgentCrm) {}

  magicFill(projectId: number, sourceText: string, partialAnswers?: Record<string, unknown>) {
    return this.crm.magicFill(projectId, sourceText, partialAnswers);
  }

  planQuickCreate(projectId: number, spec: Record<string, unknown>) {
    return this.crm.planQuickCreate(projectId, spec);
  }

  applyQuickCreate(projectId: number, plan: Record<string, unknown>) {
    return this.crm.applyQuickCreate(projectId, plan);
  }

  suggestField(projectId: number, field: string, context?: Record<string, unknown>) {
    return this.crm.suggestField(projectId, field, context);
  }
}
