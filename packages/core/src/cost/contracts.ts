/**
 * Unit economics contracts — TypeScript parity with shared fixture.
 *
 * Genetic tag: `repo.platform.unit_economics.gen1`
 * Fixture SoT: shared/fixtures/cost/unit_economics_contract_v1.json
 */
import { z } from 'zod';

export const CostDimensionSchema = z.enum([
  'cpu_ms',
  'db_read',
  'db_write',
  'db_ms',
  'jsonb_bytes_written',
  'ingress_byte',
  'egress_byte',
  'storage_byte_month',
  'llm_input_token',
  'llm_output_token',
  'llm_cache_token',
  'external_call',
  'queue_wait_ms',
  'queue_worker_ms',
  'blockchain_gas_wei',
  'cache_hit',
  'cache_miss',
]);

export const PhysicalCostClassSchema = z.enum([
  'near_zero',
  'direct_variable',
  'shared_resource',
  'storage_stock',
  'external_pass_through',
]);

export const PricingClassSchema = z.enum([
  'free',
  'included',
  'metered',
  'pass_through',
  'quote_required',
]);

export const ExecutionClassSchema = z.enum(['sync', 'async']);

export const MeasurementQualitySchema = z.enum(['actual', 'measured', 'estimated']);

export const CostBasisSchema = z.enum([
  'direct_variable',
  'allocation_driver',
  'counterfactual',
]);

export const FreeWhenConditionSchema = z.enum([
  'cache_hit',
  'etag_304',
  'idempotent_skip',
  'singleflight_follower',
]);

export const PayerKindSchema = z.enum(['platform', 'tenant', 'byok', 'third_party']);

export const CapabilityCostProfileSchema = z.object({
  id: z.string(),
  physical_class: PhysicalCostClassSchema,
  pricing_class: PricingClassSchema,
  execution_class: ExecutionClassSchema.default('sync'),
  dimensions: z.array(CostDimensionSchema),
  durable_usage: z.boolean().default(false),
  free_when: z.array(FreeWhenConditionSchema).default([]),
  genetic_tag: z.string().default('repo.platform.unit_economics.gen1'),
});

export const CostMeasurementSchema = z.object({
  dimension: CostDimensionSchema,
  quantity: z.union([z.string(), z.number()]),
  unit: z.string(),
  quality: MeasurementQualitySchema.default('measured'),
  cost_basis: CostBasisSchema.default('allocation_driver'),
  source: z.string().default('runtime'),
});

export const UsageEvidenceEventSchema = z.object({
  usage_event_id: z.string(),
  root_execution_id: z.string(),
  attempt_id: z.string(),
  parent_event_id: z.string().nullable().optional(),
  capability_id: z.string().nullable().optional(),
  operation_id: z.string().nullable().optional(),
  source_system: z.string(),
  source_event_id: z.string(),
  idempotency_key_hash: z.string().nullable().optional(),
  replay_of: z.string().nullable().optional(),
  occurred_at: z.string(),
  recorded_at: z.string(),
  service_period_start: z.string(),
  service_period_end: z.string(),
  consumer_project_id: z.number().nullable().optional(),
  resource_owner_project_id: z.number().nullable().optional(),
  billing_account_id: z.string().nullable().optional(),
  payer_kind: PayerKindSchema.default('tenant'),
  channel: z.string().default('http'),
  environment: z.string().default('unknown'),
  region: z.string().default('unknown'),
  status: z.enum([
    'success',
    'partial',
    'failed',
    'cancelled',
    'deadline_exceeded',
  ]),
  cancellation_reason: z.string().nullable().optional(),
  measurements: z.array(CostMeasurementSchema).default([]),
  provider_request_id: z.string().nullable().optional(),
  attrs: z.record(z.unknown()).default({}),
});

export const MoneyMinorSchema = z.object({
  amount_minor: z.number().int(),
  currency: z.string().default('USD'),
  decimals: z.number().int().min(0).max(12).default(6),
});

export const RatedChargeSchema = z.object({
  charge_id: z.string(),
  usage_event_id: z.string(),
  price_book_revision: z.string(),
  quantity: z.union([z.string(), z.number()]),
  money: MoneyMinorSchema,
  pricing_class: PricingClassSchema,
  included: z.boolean().default(false),
  quota_consumed: z.union([z.string(), z.number()]).default('0'),
  adjusts_charge_id: z.string().nullable().optional(),
  invoice_line_id: z.string().nullable().optional(),
});

export const CallCostPreviewSchema = z.object({
  quote_id: z.string(),
  capability_id: z.string(),
  pricing_class: PricingClassSchema,
  physical_class: PhysicalCostClassSchema,
  estimate_money: MoneyMinorSchema.nullable().optional(),
  range_min_minor: z.number().int().nullable().optional(),
  range_max_minor: z.number().int().nullable().optional(),
  currency: z.string().default('USD'),
  confidence: MeasurementQualitySchema.default('estimated'),
  price_book_revision: z.string().nullable().optional(),
  expires_at: z.string(),
  assumptions: z.array(z.string()).default([]),
  external_warning: z.string().nullable().optional(),
  async_indicated: z.boolean().default(false),
});

export const UnitEconomicsContractFixtureSchema = z.object({
  schema_version: z.number(),
  genetic_tag: z.string(),
  capability_cost_profile: CapabilityCostProfileSchema,
  usage_evidence_event: UsageEvidenceEventSchema,
  money_minor: MoneyMinorSchema,
  rated_charge: RatedChargeSchema,
  call_cost_preview: CallCostPreviewSchema,
});

export type CostDimension = z.infer<typeof CostDimensionSchema>;
export type PhysicalCostClass = z.infer<typeof PhysicalCostClassSchema>;
export type PricingClass = z.infer<typeof PricingClassSchema>;
export type CapabilityCostProfile = z.infer<typeof CapabilityCostProfileSchema>;
export type CostMeasurement = z.infer<typeof CostMeasurementSchema>;
export type UsageEvidenceEvent = z.infer<typeof UsageEvidenceEventSchema>;
export type MoneyMinor = z.infer<typeof MoneyMinorSchema>;
export type RatedCharge = z.infer<typeof RatedChargeSchema>;
export type CallCostPreview = z.infer<typeof CallCostPreviewSchema>;
export type UnitEconomicsContractFixture = z.infer<typeof UnitEconomicsContractFixtureSchema>;
