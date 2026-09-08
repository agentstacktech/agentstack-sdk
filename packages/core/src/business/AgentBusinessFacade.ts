import type { HTTPClient } from '../client/http-client';
import { BusinessCommandClient } from './BusinessCommandClient';
import type {
  AttachBusinessChildBody,
  BusinessCommandSnapshot,
  BusinessOrgSettingsPatch,
  BusinessTransferPreflight,
  CreateBusinessCompositeBody,
  CreateBusinessCompositeResult,
  LinkBusinessChildBody,
} from './types';

export class AgentBusinessFacade {
  readonly command: BusinessCommandClient;

  constructor(http: HTTPClient) {
    this.command = new BusinessCommandClient(http);
  }

  getCommandSnapshot(
    projectId: number,
    params?: { include_integrations?: boolean },
  ): Promise<BusinessCommandSnapshot> {
    return this.command.getCommandSnapshot(projectId, params);
  }

  getOrg(projectId: number): Promise<Record<string, unknown>> {
    return this.command.getOrg(projectId);
  }

  listChildren(
    projectId: number,
    params?: { limit?: number; offset?: number },
  ): Promise<{ items: Record<string, unknown>[] }> {
    return this.command.listChildren(projectId, params);
  }

  attachChild(
    projectId: number,
    body: AttachBusinessChildBody,
    idempotencyKey?: string,
  ): Promise<Record<string, unknown>> {
    return this.command.attachChild(projectId, body, idempotencyKey);
  }

  linkChild(
    projectId: number,
    body: LinkBusinessChildBody,
    idempotencyKey?: string,
  ): Promise<Record<string, unknown>> {
    return this.command.linkChild(projectId, body, idempotencyKey);
  }

  listAdoptCandidates(
    projectId: number,
    params?: { limit?: number },
  ): Promise<{ items: Record<string, unknown>[] }> {
    return this.command.listAdoptCandidates(projectId, params);
  }

  listCompositeAdoptCandidates(
    params?: { limit?: number },
  ): Promise<{ items: Record<string, unknown>[] }> {
    return this.command.listCompositeAdoptCandidates(params);
  }

  transferPreflight(projectId: number): Promise<BusinessTransferPreflight> {
    return this.command.transferPreflight(projectId);
  }

  detachChild(headProjectId: number, childProjectId: number): Promise<Record<string, unknown>> {
    return this.command.detachChild(headProjectId, childProjectId);
  }

  listTariffTemplates(projectId: number) {
    return this.command.listTariffTemplates(projectId);
  }

  applyTariff(projectId: number, templateId: string) {
    return this.command.applyTariff(projectId, templateId);
  }

  patchOrgSettings(projectId: number, body: BusinessOrgSettingsPatch) {
    return this.command.patchOrgSettings(projectId, body);
  }

  createComposite(body: CreateBusinessCompositeBody): Promise<CreateBusinessCompositeResult> {
    return this.command.createComposite(body);
  }
}

export { BusinessCommandClient };
