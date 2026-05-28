/**
 * Resource Surface Kit — SDK port (RSK-L1).
 * Genetic tag: `frontend.platform.resource_surface.gen1`
 */

export interface ListQuery {
  projectId: number;
  cursor?: string;
  filters?: Record<string, unknown>;
}

export interface MutateResult {
  ok: boolean;
  undo?: () => Promise<void>;
}

export interface IResourceSurfacePort<TItem = unknown, TDetail = TItem> {
  list(query: ListQuery): Promise<{ items: TItem[]; cursor?: string }>;
  get(id: string, query: ListQuery): Promise<TDetail>;
  mutate(actionId: string, payload: unknown, query: ListQuery): Promise<MutateResult>;
}
