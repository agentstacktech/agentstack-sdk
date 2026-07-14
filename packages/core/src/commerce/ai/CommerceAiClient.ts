import type { HTTPClient } from '../../client/http-client';

export interface GenerateProductsBody {
  preset_id?: string;
  count?: number;
  prompt?: string;
  context?: Record<string, unknown>;
}

export interface MagicFillBody {
  preset_id: string;
  source_text?: string;
  source_url?: string;
  image_url?: string;
  partial_answers?: Record<string, unknown>;
}

export interface SuggestFieldBody {
  preset_id: string;
  field: string;
  partial_answers?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

/** REST stubs for commerce AI autofill (`/api/commerce/ai/*`). Dry-run only — writes via storefront seed. */
export class CommerceAiClient {
  constructor(private readonly http: HTTPClient) {}

  async generateProducts(projectId: number, body: GenerateProductsBody = {}) {
    const response = await this.http.post('/commerce/ai/generate-products', {
      project_id: projectId,
      ...body,
    });
    return response.data ?? response;
  }

  async magicFill(projectId: number, body: MagicFillBody) {
    const response = await this.http.post('/commerce/ai/magic-fill', {
      project_id: projectId,
      ...body,
    });
    return response.data ?? response;
  }

  async suggestField(projectId: number, body: SuggestFieldBody) {
    const response = await this.http.post('/commerce/ai/suggest-field', {
      project_id: projectId,
      ...body,
    });
    return response.data ?? response;
  }
}
