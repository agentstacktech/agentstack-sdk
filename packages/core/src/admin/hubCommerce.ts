/**
 * Commerce admin hub DTOs — mirror shared/atoms/admin_hub_dto.py
 * Genetic tag: `frontend.admin.commerce_ops_hub.gen1`
 */

export interface CommerceOverview {
  storefront_ready: boolean;
  index_listing_count: number;
  stuck_escrow_count: number;
  checkout_failed_24h: number;
  assets_preset_count: number;
  crm_contacts_count: number;
  crm_open_deals: number;
  evaluated_at?: string | null;
}

export interface CommerceCrmPipelineStage {
  stage_id: string;
  label?: string;
  count: number;
}

export interface CommerceCrmSnapshot {
  project_id: number;
  contacts_count: number;
  open_deals: number;
  stale_deals: number;
  pipeline: CommerceCrmPipelineStage[];
}

export interface AssetPresetRow {
  preset_id: string;
  name?: string;
  category?: string;
  updated_at?: string | null;
}
