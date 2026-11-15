/** Tenant project genome snapshot (ecosystem.genetic). Genetic tag: core.genetic.project_genome.gen1 */

export interface ProjectGenomeMeta {
  v?: number;
  sha?: string;
  bucket_id?: string | null;
  updated_at?: string;
  node_count?: number;
  edge_count?: number;
  source?: string;
  patched?: number;
  skipped?: number;
  next_cursor?: string;
}

export interface ProjectGenomeNode {
  tag: string;
  title?: string;
  paths?: string[];
  indexes?: string[];
  content_hash?: string;
  degree?: number;
  score?: number;
  source_relpath?: string;
}

export interface ProjectGenomeEdge {
  target: string;
  kind: 'gene_affinity' | 'gene_owns_path';
  label?: string | null;
}

export interface ProjectGenomeSnapshot {
  v: number;
  meta: ProjectGenomeMeta;
  nodes: Record<string, ProjectGenomeNode>;
  edges: Record<string, ProjectGenomeEdge[]>;
}

export interface ProjectGenomeQuery {
  projectId: number;
  detail?: 'compact' | 'full';
  limit?: number;
  cursor?: string;
}

export interface ProjectGenomeSearchHit {
  tag: string;
  title?: string;
  degree?: number;
  hay?: string;
}

export interface ProjectGenomeSearchResult {
  hits: ProjectGenomeSearchHit[];
  plane?: string;
}

export interface ProjectGenomeSearchQuery {
  projectId: number;
  query: string;
  limit?: number;
}