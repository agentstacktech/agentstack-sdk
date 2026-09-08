import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../finance/unwrapApiData';
import type {
  AttachBusinessChildBody,
  BusinessCommandSnapshot,
  BusinessOrgSettingsPatch,
  BusinessTariffTemplate,
  BusinessTransferPreflight,
  CreateBusinessCompositeBody,
  CreateBusinessCompositeResult,
  LinkBusinessChildBody,
} from './types';

export class BusinessCommandClient {
  constructor(private readonly http: HTTPClient) {}

  async getCommandSnapshot(
    projectId: number,
    params?: { include_integrations?: boolean },
  ): Promise<BusinessCommandSnapshot> {
    const res = await this.http.get<BusinessCommandSnapshot>(
      `/api/projects/${projectId}/business/command-snapshot`,
      { params },
    );
    return unwrapApiData(res);
  }

  async getOrg(projectId: number): Promise<Record<string, unknown>> {
    const res = await this.http.get<Record<string, unknown>>(`/api/projects/${projectId}/org`);
    return unwrapApiData(res);
  }

  async attachChild(
    projectId: number,
    body: AttachBusinessChildBody,
    idempotencyKey?: string,
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/api/projects/${projectId}/org/children`,
      body,
      idempotencyKey
        ? { headers: { 'Idempotency-Key': idempotencyKey } }
        : undefined,
    );
    return unwrapApiData(res);
  }

  async linkChild(
    projectId: number,
    body: LinkBusinessChildBody,
    idempotencyKey?: string,
  ): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/api/projects/${projectId}/org/children/link`,
      body,
      idempotencyKey
        ? { headers: { 'Idempotency-Key': idempotencyKey } }
        : undefined,
    );
    return unwrapApiData(res);
  }

  async listAdoptCandidates(
    projectId: number,
    params?: { limit?: number },
  ): Promise<{ items: Record<string, unknown>[] }> {
    const res = await this.http.get<{ items?: Record<string, unknown>[] }>(
      `/api/projects/${projectId}/business/adopt-candidates`,
      { params },
    );
    const data = unwrapApiData(res);
    return { items: data.items ?? [] };
  }

  async listCompositeAdoptCandidates(
    params?: { limit?: number },
  ): Promise<{ items: Record<string, unknown>[] }> {
    const res = await this.http.get<{ items?: Record<string, unknown>[] }>(
      '/api/business/composite-adopt-candidates',
      { params },
    );
    const data = unwrapApiData(res);
    return { items: data.items ?? [] };
  }

  async transferPreflight(projectId: number): Promise<BusinessTransferPreflight> {
    const res = await this.http.get<BusinessTransferPreflight>(
      `/api/projects/${projectId}/business/transfer-preflight`,
    );
    return unwrapApiData(res);
  }

  async detachChild(headProjectId: number, childProjectId: number): Promise<Record<string, unknown>> {
    const res = await this.http.delete<Record<string, unknown>>(
      `/api/projects/${headProjectId}/org/children/${childProjectId}`,
    );
    return unwrapApiData(res);
  }

  async listChildren(
    projectId: number,
    params?: { limit?: number; offset?: number },
  ): Promise<{ items: Record<string, unknown>[] }> {
    const res = await this.http.get<{ items?: Record<string, unknown>[] }>(
      `/api/projects/${projectId}/org/children`,
      { params },
    );
    const data = unwrapApiData(res);
    return { items: data.items ?? [] };
  }

  async listTariffTemplates(projectId: number): Promise<{ items: BusinessTariffTemplate[] }> {
    const res = await this.http.get<{ items?: BusinessTariffTemplate[] }>(
      `/api/projects/${projectId}/business/tariff-templates`,
    );
    const data = unwrapApiData(res);
    return { items: data.items ?? [] };
  }

  async applyTariff(projectId: number, templateId: string): Promise<Record<string, unknown>> {
    const res = await this.http.post<Record<string, unknown>>(
      `/api/projects/${projectId}/business/tariff/apply`,
      { template_id: templateId },
    );
    return unwrapApiData(res);
  }

  async patchOrgSettings(
    projectId: number,
    body: BusinessOrgSettingsPatch,
  ): Promise<Record<string, unknown>> {
    const res = await this.http.patch<Record<string, unknown>>(
      `/api/projects/${projectId}/org/settings`,
      body,
    );
    return unwrapApiData(res);
  }

  async createComposite(body: CreateBusinessCompositeBody): Promise<CreateBusinessCompositeResult> {
    const res = await this.http.post<CreateBusinessCompositeResult>(
      '/api/business/composite',
      body,
    );
    return unwrapApiData(res);
  }
}
