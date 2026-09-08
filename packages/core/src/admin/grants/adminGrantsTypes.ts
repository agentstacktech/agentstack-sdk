/**
 * Grant OS admin API types — ecosystem-owner fundraising CRM.
 * Gene: `frontend.grants.os.gen1`
 */

export type GrantMilestone = {
  milestone_id: string;
  share_pct: number;
  title: string;
  acceptance: string;
  evidence_hint?: string;
  completed: boolean;
};

export type GrantOsApplication = {
  id: string;
  program_id: string;
  kind: string;
  status: string;
  title: string;
  payout_label?: string;
  apply_url?: string | null;
  deadline_at?: string | null;
  fit_score?: number;
  blocker_ids?: string[];
  next_action?: string;
  talent_is_not_grant?: boolean;
  notes?: string;
  milestones?: GrantMilestone[];
  follow_up_at?: string | null;
  video_url?: string | null;
  farcaster_url?: string | null;
  packet_path?: string | null;
};

export type GrantOsScoreBreakdown = {
  fit_score: number;
  payout_weight: number;
  urgency_weight: number;
  evidence_weight: number;
  readiness_weight: number;
  next_action: string;
};

export type GrantOsOperatorHint = {
  kind: string;
  label: string;
  text: string;
};

export type GrantOsApplicationDetail = {
  application: GrantOsApplication;
  program: Record<string, unknown> | null;
  score: GrantOsScoreBreakdown;
  earning_playbooks?: Array<Record<string, unknown>>;
  operator_hints?: GrantOsOperatorHint[];
};

export type GrantOsPipelineData = {
  applications: GrantOsApplication[];
  grs: number;
  grs_unavailable?: boolean;
  grs_error?: string | null;
};

export type GrantOsAnchorFields = {
  problem: string;
  innovation: string;
  team: string;
  commercial_path: string;
  technical_approach: string;
  sdg_tags: number[];
  demo_url: string;
};

export type GrantOsAnchorResponse = {
  anchor: GrantOsAnchorFields & { genetic_tag?: string };
  nsf_pitch?: string;
  accelerator_blurb?: string;
};

export type GrantOsComposeItem = {
  path: string;
  label: string;
  kind: string;
  required: boolean;
  exists: boolean;
};

export type GrantOsComposeLink = {
  id: string;
  label: string;
  path?: string;
  url?: string;
  exists?: boolean;
};

export type GrantOsFormField = {
  field: string;
  value: string;
};

export type GrantOsComposeData = {
  attachments: string[];
  missing: string[];
  items?: GrantOsComposeItem[];
  resource_links?: GrantOsComposeLink[];
  form_fields?: GrantOsFormField[];
  public_verify_url: string;
  one_liner_en?: string;
  program_id?: string;
  packet_program?: string;
  variant?: string | null;
  grs_estimate?: number | null;
};

/** Partial catalog row for PROGRAM_REGISTRY.yaml upsert. */
export type GrantOsCatalogPatch = {
  kind?: string;
  title?: string;
  payout_label?: string;
  apply_url?: string;
  deadline_at?: string;
  primary_metric?: string;
  packet_program?: string;
  genetic_tag?: string;
  talent_is_not_grant?: boolean;
  wave?: string;
  notes?: string;
  scoring_hints?: Record<string, string>;
};

/** Partial CRM application metadata patch (not status transitions). */
export type GrantOsApplicationPatch = {
  title?: string;
  payout_label?: string;
  apply_url?: string;
  deadline_at?: string;
  primary_metric?: string;
  notes?: string;
  video_url?: string;
  farcaster_url?: string;
};

/** One-shot catalog + optional CRM seed. */
export type GrantOsOpportunityUpsert = GrantOsCatalogPatch & {
  program_id: string;
  seed_crm?: boolean;
  sync_packet?: boolean;
};

export type GrantOsHubSnapshot = {
  overview: {
    count: number;
    by_status: Record<string, number>;
    w0_checklist: Record<string, string>;
    top: GrantOsApplication[];
  };
  pipeline: GrantOsPipelineData;
  reminders: { reminders: Array<{ program_id: string; action: string; due: string }> };
  integrity: { ok: boolean; failures: string[] };
};

export type EarningPlaybook = {
  id: string;
  title: string;
  genetic_tag?: string;
  revenue_model?: string;
  grant_synergy?: string[];
  hot_path?: string;
  mcp_actions?: string[];
  evidence_metric?: string;
  public_demo?: string;
};
