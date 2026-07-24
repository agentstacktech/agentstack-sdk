/**
 * NeuroCache / Scale admin hub DTOs — mirror shared diagnostics BFFs.
 * Genetic tag: `frontend.admin.scale_hub.gen1`
 */

export interface NamespaceMemoryDetail {
  entries: number;
  bytes: number;
  evictions: number;
}

export interface GeneTagMemoryRow {
  tag: string;
  bytes: number;
}

export interface NeuroCacheStats {
  total_entries: number;
  total_bytes: number;
  memory_by_ns: Record<string, NamespaceMemoryDetail>;
  named_hit_rates: Record<string, number>;
  gene_tag_rows: GeneTagMemoryRow[];
  worker_id?: string;
  as_of?: string | null;
  gtpi?: Record<string, unknown>;
  hot_regions?: {
    protein_hot_region_hit?: number;
    protein_hot_region_miss?: number;
    gene_hot_promote?: number;
  };
  note?: string;
}

export interface EcsSystemHealthRow {
  system_id: string;
  genetic_tag?: string;
  watched_paths?: string[];
  watched_paths_count?: number;
  skip_beacon_session?: number;
}
