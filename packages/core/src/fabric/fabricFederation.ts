/**
 * Fabric federation types (`sdk.fabric.gen1`, T10.4, B6).
 */
import { z } from 'zod';

export const federationScopeSchema = z.enum(['context_read', 'capability_invoke']);

export const federationGrantStatusSchema = z.enum(['pending', 'active', 'rejected']);

export const fabricFederationGrantSchema = z.object({
  id: z.string(),
  source_project_id: z.number(),
  target_project_id: z.number(),
  scopes: z.array(federationScopeSchema),
  allowed_capability_ids: z.array(z.string()).default([]),
  status: federationGrantStatusSchema.default('pending'),
  consent_by: z.number(),
  consented_at: z.number(),
  accepted_by: z.number().nullable().optional(),
  accepted_at: z.number().nullable().optional(),
  rejected_by: z.number().nullable().optional(),
  rejected_at: z.number().nullable().optional(),
  expires_at: z.number().nullable().optional(),
  revoked_at: z.number().nullable().optional(),
  audit_note: z.string().optional(),
});

export const federationGrantsResponseSchema = z.object({
  source_project_id: z.number().optional(),
  consumer_project_id: z.number().optional(),
  count: z.number(),
  grants: z.array(fabricFederationGrantSchema),
});

export type FederationScope = z.infer<typeof federationScopeSchema>;
export type FederationGrantStatus = z.infer<typeof federationGrantStatusSchema>;
export type FabricFederationGrant = z.infer<typeof fabricFederationGrantSchema>;

export type CreateFederationGrantRequest = {
  target_project_id: number;
  scopes?: FederationScope[];
  allowed_capability_ids?: string[];
  expires_at?: number | null;
  audit_note?: string;
};

export type CreateFederationGrantResponse = {
  success: boolean;
  grant: FabricFederationGrant;
};

export type RevokeFederationGrantResponse = {
  success: boolean;
  grant: FabricFederationGrant;
};

export type AcceptFederationGrantResponse = {
  success: boolean;
  grant: FabricFederationGrant;
};

export type RejectFederationGrantResponse = {
  success: boolean;
  grant: FabricFederationGrant;
};
