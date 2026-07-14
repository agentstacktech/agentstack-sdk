/**
 * Context Fabric REST client (`sdk.fabric.gen1`).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';
import {
  parseContextBundle,
  type ContextBundle,
  type ContextRequest,
} from './contextBundle';

export async function getContext(
  http: HTTPClient,
  req: ContextRequest,
  options?: { memory_session_id?: string },
): Promise<ContextBundle> {
  const body = {
    ...req,
    memory_session_id: options?.memory_session_id,
  };
  const res = await http.post<{ bundle: unknown }>('/context/task', body);
  const data = unwrapApiData(res);
  return parseContextBundle(data.bundle);
}
