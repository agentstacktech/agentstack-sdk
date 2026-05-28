/**
 * Unified Application Manifest v1 — mirrors Python `ai_builder.manifest.schema`.
 * Genetic tag: repo.platform.app_manifest.gen1
 */
import { z } from "zod";

export const routeSpecSchema = z.object({
  path: z.string(),
  module_id: z.string(),
  props: z.record(z.unknown()).default({}),
  capability_gate: z.array(z.string()).default([]),
});

export const dataBindingSpecSchema = z.object({
  source: z.enum(["dna", "logic_template", "mcp_action", "scheduler"]),
  ref: z.string(),
  params: z.record(z.unknown()).default({}),
});

export const appManifestSchema = z.object({
  manifest_version: z.literal("1").default("1"),
  app_id: z.string(),
  name: z.string(),
  version: z.string(),
  audience: z.enum(["user", "founder", "developer"]).default("user"),
  shell: z.record(z.unknown()).default({}),
  routes: z.array(routeSpecSchema),
  modules: z.array(z.string()),
  capabilities: z.array(z.string()),
  data_bindings: z.array(dataBindingSpecSchema).default([]),
  logic_rules: z.array(z.string()).default([]),
  rbac: z.record(z.unknown()).default({}),
  i18n: z.record(z.unknown()).default({}),
  custom_slots: z.record(z.string()).default({}),
  parent_uuid: z.string().nullable().optional(),
  generation: z.number().int().nullable().optional(),
});

export type AppManifestV1 = z.infer<typeof appManifestSchema>;
export type RouteSpecV1 = z.infer<typeof routeSpecSchema>;
export type DataBindingSpecV1 = z.infer<typeof dataBindingSpecSchema>;
