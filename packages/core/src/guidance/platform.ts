/**
 * Thin platform guidance facade (`sdk.guidance.gen1` / GA-NEW-08).
 * Prefer this over ad-hoc pathServerSync when integrating outside the SPA.
 */
export { GuidanceClient } from './client/GuidanceClient';
export type {
  GuidanceDefinitionDto,
  GuidanceHydrateDto,
  GuidancePathStatusDto,
  GuidanceSessionDto,
  UpsertGuidanceDefinitionInput,
} from './client/GuidanceClient';
export { RemotePathStore } from './store/RemotePathStore';
export { LocalPathStore } from './store/LocalPathStore';
