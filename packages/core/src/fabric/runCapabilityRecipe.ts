/**
 * CapabilityRecipe REST client (`sdk.fabric.gen1`, T10.1).
 */
import type { HTTPClient } from '../client/http-client';
import { unwrapApiData } from '../client/unwrapApiData';
import { parseCapabilityResult, type CapabilityResult } from './capabilityResult';
import {
  capabilityRecipeListResponseSchema,
  type CapabilityRecipeListResponse,
} from './capabilityRecipe';

export type RunCapabilityRecipeRequest = {
  params?: Record<string, unknown>;
  project_id?: number;
  /** WCP RECIPE-SAGA-01 — reverse compensate steps on failure. */
  compensate?: boolean;
};

export type RunCapabilityRecipeResponse = {
  success: boolean;
  recipe_id?: string;
  steps?: Array<{
    step_id: string;
    capability_id: string;
    success: boolean;
    error_code?: string;
    trace_id?: string;
  }>;
  failed_step?: string;
  capability_result?: CapabilityResult;
  trace_id?: string;
  error_code?: string;
};

export async function listCapabilityRecipes(http: HTTPClient): Promise<CapabilityRecipeListResponse> {
  const res = await http.get<unknown>('/capabilities/recipes');
  return capabilityRecipeListResponseSchema.parse(unwrapApiData(res));
}

export async function runCapabilityRecipe(
  http: HTTPClient,
  recipeId: string,
  body: RunCapabilityRecipeRequest,
): Promise<RunCapabilityRecipeResponse> {
  const res = await http.post<RunCapabilityRecipeResponse>(
    `/capabilities/recipes/${encodeURIComponent(recipeId)}/run`,
    body,
  );
  const data = unwrapApiData(res);
  const envelope = data.capability_result
    ? parseCapabilityResult(data.capability_result)
    : undefined;
  return {
    ...data,
    capability_result: envelope,
    trace_id: data.trace_id ?? envelope?.trace_id,
  };
}
