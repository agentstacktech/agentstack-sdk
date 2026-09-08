/**
 * Neural-graph BFF types for SDK consumers (NV-BFF-04 / NV-BFF-06).
 * Genetic tag: frontend.admin.neural_visualizer.gen1
 */

export type NeuralGraphHeatMeta = {
  /** Platform ships `process_local` only (`scale_no_redis`). `aggregated` reserved, unused. */
  scope?: 'process_local' | 'aggregated';
  worker_id?: string;
  aggregation?: string;
  hint?: string;
  configured_workers?: number;
  multi_worker_likely?: boolean;
};

export type NeuralGraphHostSlice = {
  cpu_percent?: number;
  memory_percent?: number;
  disk_percent?: number;
  uptime_seconds?: number;
  memory?: { percent?: number; total_mb?: number; used_mb?: number };
  disk?: { percent?: number; total_gb?: number; used_gb?: number };
  cpu?: { percent?: number };
};

export type NeuralGraphExecutionLogsSlice = {
  services?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: string;
};

export type NeuralGraphHeatSample = {
  key: string;
  score: number;
  raw: number;
  plane?: string;
  entity_key?: string;
  redacted?: boolean;
};

export type NeuralGraphHeatPayload = {
  protein?: NeuralGraphHeatSample[];
  api?: Record<string, unknown>;
  dna_query?: NeuralGraphHeatSample[];
  note?: string;
  redacted_count?: number;
};

export type NeuralGraphCompositionEdge = {
  id: string;
  source: string;
  target: string;
  kind?: string;
  label?: string;
};

export type NeuralGraphGeneHeatSample = {
  genetic_tag: string;
  key: string;
  score: number;
  raw: number;
};

export type NeuralGraphOrganismCell = {
  name: string;
  incarnation?: number;
  phase?: string;
  activity?: string;
  activity_detail?: string | null;
  draining?: boolean;
  age_s?: number;
  max_life_time_s?: number | null;
  remaining_max_life_s?: number | null;
  owner_project_id?: number;
};

export type NeuralGraphL1CacheNsStats = {
  name: string;
  items: number;
  max_items?: number;
  hits?: number;
  misses?: number;
  hit_rate_percent?: number;
  evictions?: number;
  tags_count?: number;
  estimated_memory_bytes?: number;
};

export type NeuralGraphRouterInfo = {
  direct_routes?: Record<string, Record<string, Record<string, unknown>>>;
  range_route_keys?: string[];
  stats?: Record<string, unknown>;
  event_types?: number;
};

export type NeuralGraphOrganIndex = {
  id: string;
  title: string;
  kind?: string;
  genetic_tags?: string[];
  capability_ids?: string[];
  mutation_category?: string | null;
};

/** Full Visualizer Gen2 BFF payload from GET /api/diagnostics/neural-graph. */
export type NeuralGraphData = {
  worker_id?: string;
  heat_meta?: NeuralGraphHeatMeta;
  organelles?: Record<string, string[]>;
  router?: NeuralGraphRouterInfo;
  cache?: Record<string, NeuralGraphL1CacheNsStats>;
  cells?: NeuralGraphOrganismCell[];
  cells_meta?: { cells_total?: number; cells_in_scope?: number; project_id?: number };
  schedule?: {
    pending_count?: number;
    driver_running?: boolean;
    next_wake_at_monotonic?: number | null;
  };
  io_db?: { straggler_count?: number; max_workers?: number; shutdown?: boolean };
  host?: NeuralGraphHostSlice;
  database?: Record<string, unknown>;
  entities?: Record<string, unknown>;
  execution_logs?: NeuralGraphExecutionLogsSlice;
  heat?: NeuralGraphHeatPayload;
  composition_edges?: NeuralGraphCompositionEdge[];
  protein_commands?: string[];
  processors?: string[];
  protein_live_meta?: {
    commands_ok?: boolean;
    processors_ok?: boolean;
    processors_root?: string | null;
    commands_count?: number;
    processors_count?: number;
  };
  gene_heat?: {
    samples?: NeuralGraphGeneHeatSample[];
    adoption_hints?: Array<{
      genetic_tag: string;
      score: number;
      adoption_ids: string[];
      suggestion: string;
    }>;
    note?: string;
  };
  scope_heat?: {
    samples?: NeuralGraphGeneHeatSample[];
    plane?: string;
    note?: string;
    raw?: number;
  };
  gene_edges?: NeuralGraphCompositionEdge[];
  hot_region_hints?: Array<{
    genetic_tag: string;
    score: number;
    status: 'warm' | 'cold' | 'pending';
    paths: string[];
  }>;
  gene_token_stats?: {
    top_tokens?: Array<{ key: string; kind?: string; value?: string; count: number }>;
    binding_count?: number;
    token_count?: number;
    worker_id?: string;
    note?: string;
  };
  /** Slim organ descriptor join (`core.composition.organ_descriptor.gen1`). */
  organs_index?: NeuralGraphOrganIndex[];
  degraded?: boolean;
  timestamp?: string;
};

/** @deprecated Alias — prefer NeuralGraphData */
export type NeuralGraphBffSlice = NeuralGraphData;

export type NeuralGraphInclude =
  | 'topology'
  | 'heat'
  | 'composition'
  | 'gene_heat'
  | 'scope_heat'
  | 'gene_edges'
  | 'hot_region_hints'
  | 'protein_live';
