/**
 * Demo hosting public API (`sdk.hosting.demo.gen1`).
 */
export interface DemoHostingStatus {
  enabled: boolean;
  pool_depth: number;
  ttl_seconds: number;
  templates: string[];
  sandbox_project_id?: number;
  promo_demo_store_path?: string | null;
}

/** Shown only when `/status` cannot be read. Live leases use `demo_ttl_seconds()`. */
export const DEMO_TTL_FALLBACK_SECONDS = 3600;

export async function fetchDemoHostingStatus(apiBase: string): Promise<DemoHostingStatus> {
  const base = apiBase.replace(/\/$/, '');
  const res = await fetch(`${base}/public/demo/status`);
  if (!res.ok) {
    return { enabled: false, pool_depth: 0, ttl_seconds: DEMO_TTL_FALLBACK_SECONDS, templates: [] };
  }
  return (await res.json()) as DemoHostingStatus;
}
