/** Business command snapshot types — mirror shared/atoms/business_command_dto.py */

export type BusinessCommandSnapshot = {
  head_project_id: number;
  display_name?: string;
  org?: Record<string, unknown>;
  finance?: Record<string, unknown>;
  crm?: Record<string, unknown>;
  staff?: Record<string, unknown>;
  children?: Array<Record<string, unknown>>;
    children_finance?: Record<string, unknown> | null;
    business_treasury?: BusinessTreasurySlice | null;
  tariff?: Record<string, unknown>;
  integrations_index?: Record<string, unknown> | null;
  metrics?: Record<string, unknown>;
  as_of?: string;
};

export type BusinessTariffTemplate = {
  template_id: string;
  category?: string;
  name?: string;
  effects?: Record<string, number>;
};

export type AttachBusinessChildBody = {
  organ: string;
  display_name?: string;
  preset_id?: string;
};

export type LinkBusinessChildBody = {
  existing_project_id: number;
  organ: string;
  display_name?: string;
};

export type BusinessAdoptCandidate = {
  project_id: number;
  display_name: string;
  kind: string;
};

export type BusinessTreasurySlice = {
  head?: Record<string, unknown>;
  children?: Array<Record<string, unknown>>;
  consolidated?: {
    treasury_agnt_atomic?: string | null;
    operating_wallet_count?: number;
    treasury_fiat_total_usd?: number | null;
  };
};

export type BusinessOrgSettingsPatch = {
  legal_name?: string | null;
  industry?: string | null;
  inherit_membership?: boolean;
  federation_mode?: 'auto_active' | 'manual';
  max_children?: number;
};

export type CreateBusinessCompositeBody = {
  name: string;
  organs?: string[];
  tariff_template_id?: string;
  adopt?: Array<{
    existing_project_id: number;
    organ: string;
    display_name?: string;
  }>;
};

export type CreateBusinessCompositeResult = {
  success?: boolean;
  head_project_id: number;
  name: string;
  children: Array<Record<string, unknown>>;
};

export type BusinessTransferPreflight = {
  project_id?: number;
  can_transfer?: boolean;
  blockers?: Array<{
    domain?: string;
    code?: string;
    title?: string;
    detail?: string;
  }>;
  warnings?: Array<Record<string, unknown>>;
};
