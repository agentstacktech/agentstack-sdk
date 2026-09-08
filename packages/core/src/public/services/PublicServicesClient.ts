/**
 * Thin public services BFF client — mirrors SPA `publicServicesPort` without duplicate logic.
 * Gene: `frontend.public.services_offers.gen1` · `sdk.commerce.services.gen1`
 */

import type { HTTPClient } from '../../client/http-client';
import type {
  KickoffPreflight,
  PublicServicesCatalog,
  ServicesInquiryBody,
} from './publicServicesTypes';

export class PublicServicesClient {
  constructor(private readonly http: HTTPClient) {}

  async getCatalog(signal?: AbortSignal): Promise<PublicServicesCatalog> {
    const res = await this.http.get<PublicServicesCatalog>(
      '/api/public/services/catalog',
      {},
      { signal, retry: { maxAttempts: 0, delay: 0 } },
    );
    return res.data ?? { version: 1, skus: [], disclaimer: '', work_examples: [], project_types: [], reliability: [], rate_card: [] };
  }

  async getKickoffPreflight(
    sku: string,
    contactId: string,
    signal?: AbortSignal,
  ): Promise<KickoffPreflight> {
    const params = new URLSearchParams({
      sku: sku.trim().toLowerCase(),
      contact: contactId.trim(),
    });
    const res = await this.http.get<KickoffPreflight>(
      `/api/public/services/kickoff-preflight?${params.toString()}`,
      {},
      { signal, retry: { maxAttempts: 0, delay: 0 } },
    );
    return res.data ?? { ok: false, reason: 'unavailable' };
  }

  async postInquiry(
    body: ServicesInquiryBody,
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; inquiry_id: string; contact_id?: string }> {
    const res = await this.http.post<{ ok: boolean; inquiry_id: string; contact_id?: string }>(
      '/api/public/services/inquiry',
      body,
      { signal, retry: { maxAttempts: 0, delay: 0 } },
    );
    return res.data ?? { ok: false, inquiry_id: '' };
  }
}
