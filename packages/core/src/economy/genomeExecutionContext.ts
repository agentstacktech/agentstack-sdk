/**
 * Genome execution context — mirrors shared/atoms (Phase 2).
 * Genetic tag: sdk.protocol.genome_context.gen1
 */

export type GenomeEntityType = 'agent' | 'project' | 'user' | 'system';

export interface GenomeTagV1 {
  entity_type: GenomeEntityType;
  generation: number;
  parent_dna_hash: string;
  genetic_tag: string;
  checkpoint_epoch?: number | null;
}

export interface GenomeExecutionContextV1 extends GenomeTagV1 {
  task_hash: string;
}

export interface GenomeLineageRecord {
  entity_id: string;
  commit_hash?: string;
  generation?: number;
  genetic_tag?: string;
  updated_at?: string;
}
