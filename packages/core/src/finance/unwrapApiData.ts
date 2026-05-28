import type { APIResponse } from '../types';

/** Unwrap {@link HTTPClient} response envelope — same contract as economy clients. */
export function unwrapApiData<T>(response: APIResponse<T>): T {
  return response.data;
}
