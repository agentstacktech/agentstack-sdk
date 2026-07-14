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

export async function fetchDemoHostingStatus(apiBase: string): Promise<DemoHostingStatus> {
  const base = apiBase.replace(/\/$/, '');
  const res = await fetch(`${base}/public/demo/status`);
  if (!res.ok) {
    return { enabled: false, pool_depth: 0, ttl_seconds: 3600, templates: [] };
  }
  return (await res.json()) as DemoHostingStatus;
}
