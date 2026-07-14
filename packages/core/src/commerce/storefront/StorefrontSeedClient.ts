import type { HTTPClient } from '../../client/http-client';



export interface StorefrontSeedProductSpec {

  row_id?: string;

  preset_id?: string;

  name: string;

  sku?: string;

  price_usdt?: string;

  fulfillment_mode?: string;

  create_listing?: boolean;

  featured?: boolean;

  quantity?: number;

  preset_inputs?: Record<string, unknown>;

  description?: string;

  image_url?: string;

  tags?: string[];

  slug?: string;

  group_id?: string;

  variant?: Record<string, string>;

  compare_at_usdt?: string;

  existing_asset_id?: string;

}



export interface StorefrontSeedOptions {

  set_featured?: boolean;

  auto_accept?: boolean;

  listing_type?: string;

  whitelist_enabled?: boolean;

}



export interface StorefrontSeedPlanBody {

  specs: StorefrontSeedProductSpec[];

  options?: StorefrontSeedOptions;

}



export interface StorefrontSeedApplyBody {

  plan: Record<string, unknown>;

  idempotency_key?: string;

}



export interface StorefrontSeedUndoBody {

  run_id: string;

}



/** REST facade for `StorefrontSeedService` (`/api/commerce/storefront/seed/*`). */

export class StorefrontSeedClient {

  constructor(private readonly http: HTTPClient) {}



  async plan(projectId: number, body: StorefrontSeedPlanBody) {

    const response = await this.http.post(

      '/commerce/storefront/seed/plan',

      body,

      { params: { project_id: projectId } },

    );

    return response.data ?? response;

  }



  async apply(projectId: number, body: StorefrontSeedApplyBody) {

    const response = await this.http.post(

      '/commerce/storefront/seed/apply',

      body,

      { params: { project_id: projectId } },

    );

    return response.data ?? response;

  }



  async undo(projectId: number, body: StorefrontSeedUndoBody) {

    const response = await this.http.post(

      '/commerce/storefront/seed/undo',

      { run_id: body.run_id },

      { params: { project_id: projectId } },

    );

    return response.data ?? response;

  }



  async ingest(

    projectId: number,

    body: {

      source: string;

      preset_id?: string;

      text?: string;

      specs?: unknown[];

    },

  ) {

    const response = await this.http.post(

      '/commerce/storefront/seed/ingest',

      body,

      { params: { project_id: projectId } },

    );

    return response.data ?? response;

  }



  async saveDraft(projectId: number, rows: unknown[]) {

    const response = await this.http.put(

      '/commerce/storefront/studio/draft',

      { rows },

      { params: { project_id: projectId } },

    );

    return response.data ?? response;

  }



  async loadDraft(projectId: number) {

    const response = await this.http.get('/commerce/storefront/studio/draft', {

      params: { project_id: projectId },

    });

    return response.data ?? response;

  }



  async oneClickFill(

    projectId: number,

    body?: { limit?: number; idempotency_key?: string },

  ) {

    const response = await this.http.post(

      '/commerce/storefront/seed/one-click-fill',

      body ?? {},

      { params: { project_id: projectId } },

    );

    return response.data ?? response;

  }

}


