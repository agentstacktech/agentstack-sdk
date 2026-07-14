import type { APIResponse } from '../types';

/** Unwrap {@link HTTPClient} response envelope — payload lives in `.data`. */
export function unwrapApiData<T>(response: APIResponse<T>): T {
  return response.data;
}
