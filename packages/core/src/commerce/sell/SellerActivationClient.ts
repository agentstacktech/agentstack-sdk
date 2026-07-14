import type { HTTPClient } from '../../client/http-client';
import { mapCommerceHttpError } from '../errors/mapCommerceHttpError';

export type ActivationProductSpec = {
  name?: string;
  asset_id?: string;
  price_usdt?: string;
  description?: string;
};

export type ActivationSpec = {
  products?: ActivationProductSpec[];
  product_name?: string;
  use_starter?: boolean;
  use_ai?: boolean;
  ai_prompt?: string;
  publish_hosted?: boolean;
  bucket_name?: string;
};

export type ActivationChecklist = {
  has_listing: boolean;
  policy_public: boolean;
  index_visible: boolean;
  wallet_ready: boolean;
};

export type ShareKit = {
  store_url: string;
  copy_link?: string;
  qr_data_url?: string;
  social?: Record<string, string>;
};

export type ActivationResult = {
  native_in_ui_url: string;
  hosted_url?: string | null;
  listings: Array<Record<string, unknown>>;
  checklist: ActivationChecklist;
  share: ShareKit;
  activation_id?: string;
};

function mapActivationHttpError(err: unknown): never {
  const e = err as {
    status?: number;
    response?: { status?: number; data?: Record<string, unknown> };
    data?: Record<string, unknown>;
  };
  const status = Number(e?.status ?? e?.response?.status ?? 0);
  const body = (e?.response?.data ?? e?.data) as
    | { error?: string; detail?: string; error_code?: string }
    | undefined;
  throw mapCommerceHttpError(status || 500, body);
}

function flattenChecklist(
  raw: Record<string, unknown> | undefined,
  indexedListings = 0,
  earningsWalletId?: string | null,
): ActivationChecklist {
  const steps = Array.isArray(raw?.steps)
    ? (raw?.steps as Array<{ id?: string; done?: boolean }>)
    : [];
  const stepDone = (id: string) =>
    steps.some((s) => s.id === id && Boolean(s.done));
  const flat = raw as ActivationChecklist | undefined;
  if (
    flat &&
    typeof flat.has_listing === 'boolean' &&
    typeof flat.policy_public === 'boolean'
  ) {
    return flat;
  }
  return {
    has_listing: stepDone('has_active_listing') || indexedListings > 0,
    policy_public: stepDone('policy_public'),
    index_visible: stepDone('index_visible'),
    wallet_ready: Boolean(earningsWalletId) || stepDone('has_catalog_asset'),
  };
}

function mapShareKit(
  shareKit: Record<string, unknown> | undefined,
  share: Record<string, unknown> | undefined,
  projectId?: number,
): ShareKit {
  if (share?.store_url) {
    return {
      store_url: String(share.store_url),
      copy_link:
        share.copy_link != null ? String(share.copy_link) : String(share.store_url),
      qr_data_url:
        share.qr_data_url != null ? String(share.qr_data_url) : undefined,
      social: share.social as Record<string, string> | undefined,
    };
  }
  const shop =
    shareKit?.shop_url ??
    (projectId != null ? `/user/shop?scope=project&project=${projectId}` : '');
  return {
    store_url: String(shop),
    copy_link: String(shop),
    qr_data_url:
      shareKit?.qr_data_url != null ? String(shareKit.qr_data_url) : undefined,
    social: shareKit?.social as Record<string, string> | undefined,
  };
}

function mapActivationResponse(
  data: Record<string, unknown>,
  projectId?: number,
): ActivationResult {
  const shareKit = data.share_kit as Record<string, unknown> | undefined;
  const share = data.share as Record<string, unknown> | undefined;
  const checklistRaw = (data.checklist_raw ?? data.checklist) as
    | Record<string, unknown>
    | undefined;
  const indexed = Number(data.indexed_listings ?? 0);
  const listings = Array.isArray(data.listings)
    ? (data.listings as Array<Record<string, unknown>>)
    : Array.isArray((data.seed_result as Record<string, unknown> | undefined)?.items)
      ? ((data.seed_result as Record<string, unknown>).items as Array<
          Record<string, unknown>
        >)
      : [];
  return {
    native_in_ui_url: String(
      data.native_in_ui_url ??
        (projectId != null
          ? `/user/shop?scope=project&project=${projectId}`
          : ''),
    ),
    hosted_url: data.hosted_url != null ? String(data.hosted_url) : null,
    listings,
    checklist: flattenChecklist(
      checklistRaw,
      indexed,
      data.earnings_wallet_id as string | undefined,
    ),
    share: mapShareKit(shareKit, share, projectId),
    activation_id:
      data.activation_id != null ? String(data.activation_id) : undefined,
  };
}

export class SellerActivationClient {
  constructor(private readonly http: HTTPClient) {}

  async activate(
    projectId: number,
    spec: ActivationSpec,
    idempotencyKey?: string,
  ): Promise<ActivationResult> {
    const headers = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined;
    try {
      const response = await this.http.post(
        '/commerce/sell/activate',
        { project_id: projectId, ...spec },
        { headers },
      );
      const data = (response.data ?? response) as Record<string, unknown>;
      const payload = (data.result ?? data.activation ?? data) as Record<
        string,
        unknown
      >;
      return mapActivationResponse(payload, projectId);
    } catch (err) {
      mapActivationHttpError(err);
    }
  }

  async getActivationState(projectId: number): Promise<Record<string, unknown>> {
    const response = await this.http.get('/commerce/sell/activation', {
      project_id: projectId,
    });
    const raw = (response.data ?? response) as Record<string, unknown>;
    const mapped = mapActivationResponse(raw, projectId);
    return {
      ...raw,
      ...mapped,
      activated: Boolean(raw.activated ?? raw.completed_at),
    };
  }
}
