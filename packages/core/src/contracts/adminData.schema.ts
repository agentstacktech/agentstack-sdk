/**
 * Zod schemas for admin data BFF responses (contract tests + optional runtime parse).
 * Gene: `sdk.platform.admin_data.gen1`
 */

import { z } from 'zod';

export const adminDataUserRowSchema = z
  .object({
    user_id: z.number().optional(),
    id: z.number().optional(),
    email: z.string().optional(),
    username: z.string().optional(),
    display_name: z.string().optional(),
  })
  .passthrough();

export const adminDataProjectRowSchema = z
  .object({
    project_id: z.number().optional(),
    id: z.number().optional(),
    name: z.string().optional(),
    is_active: z.boolean().optional(),
  })
  .passthrough();

export const adminDataPeopleResponseSchema = z.object({
  projects: z.array(adminDataProjectRowSchema),
  users: z.array(adminDataUserRowSchema),
  meta: z.object({
    project_id: z.number(),
    project_count: z.number(),
    user_count: z.number(),
    page: z.number(),
    per_page: z.number(),
    projects_source: z.string().optional(),
    users_source: z.string().optional(),
  }),
});

export const adminDataDnaListResponseSchema = z.object({
  table: z.string(),
  entities: z.array(z.record(z.unknown())),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const adminDataHealthResponseSchema = z.object({
  ok: z.boolean(),
  projects_count: z.number(),
  users_count: z.number(),
  sample_projects_returned: z.number().optional(),
  ecosystem_project_id: z.number().optional(),
  dna_list_counts: z
    .object({
      project: z.number().optional(),
      user: z.number().optional(),
    })
    .optional(),
});
