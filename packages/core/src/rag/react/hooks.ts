import { useQuery, type Query } from '@tanstack/react-query';
import type { RagCollection, RagRequestOpts } from '../types';

export type RagReactClient = {
  listCollections: (opts?: RagRequestOpts) => Promise<{ collections?: RagCollection[] }>;
  getIngestJobStatus: (jobId: string, opts?: RagRequestOpts) => Promise<Record<string, unknown>>;
  search: (
    collectionId: string,
    body: { query: string; top_k?: number; hybrid?: boolean; mmr?: boolean },
    opts?: RagRequestOpts,
  ) => Promise<{ results?: unknown[] }>;
};

export function useRagCollections(
  client: RagReactClient,
  homeProjectId?: number,
) {
  return useQuery({
    queryKey: ['rag', 'collections', homeProjectId ?? 0],
    queryFn: async () => {
      const res = await client.listCollections(
        homeProjectId ? { homeProjectId } : undefined,
      );
      return res.collections ?? [];
    },
    staleTime: 20_000,
    enabled: (homeProjectId ?? 0) > 0,
  });
}

export function useRagIngestJob(
  client: RagReactClient,
  jobId: string | null,
  homeProjectId?: number,
) {
  return useQuery({
    queryKey: ['rag', 'ingest-job', jobId, homeProjectId ?? 0],
    queryFn: async () => {
      if (!jobId) return null;
      return client.getIngestJobStatus(
        jobId,
        homeProjectId ? { homeProjectId } : undefined,
      );
    },
    enabled: Boolean(jobId),
    refetchInterval: (query: Query<Record<string, unknown> | null>) =>
      query.state.data && (query.state.data as { done?: boolean }).done ? false : 2500,
  });
}

export function useRagSearch(
  client: RagReactClient,
  collectionId: string | null,
  query: string,
  homeProjectId?: number,
) {
  return useQuery({
    queryKey: ['rag', 'search', collectionId, query, homeProjectId ?? 0],
    queryFn: async () => {
      if (!collectionId || !query.trim()) return [];
      const res = await client.search(
        collectionId,
        { query, top_k: 8, hybrid: true },
        homeProjectId ? { homeProjectId } : undefined,
      );
      return res.results ?? [];
    },
    enabled: Boolean(collectionId && query.trim()),
  });
}
