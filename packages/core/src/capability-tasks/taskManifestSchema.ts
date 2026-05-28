/**
 * Task manifest schema — SDK mirror (`sdk.capability_tasks.gen1`).
 */
import { z } from 'zod';

export const taskCapabilityManifestSchema = z.object({
  taskId: z.string().min(1),
  geneticTags: z.array(z.string()).min(1),
  domain: z.string().min(1),
  comfortBudget: z.number().int().min(1).max(5).default(3),
  shells: z.array(z.enum(['dev', 'user'])).min(1),
  engineeringOnly: z.boolean().default(false),
  surfaces: z.array(
    z.enum(['inline', 'card', 'banner', 'drawer', 'modal', 'page', 'hidden']),
  ).min(1),
  launch: z.object({
    deepLink: z.record(z.unknown()),
    actionPortId: z.string().optional(),
    resourceActionId: z.string().optional(),
  }),
  component: z.object({
    exportName: z.string(),
    chunk: z.string(),
  }),
  beacons: z.object({
    start: z.string(),
    done: z.string(),
    fail: z.string(),
  }),
  verify: z.object({ portId: z.string().optional() }).optional(),
  estimatedMin: z.number().int().positive().optional(),
  msc: z
    .object({
      titleKey: z.string(),
      titleDefault: z.string(),
      helpExcerpt: z.string().optional(),
    })
    .optional(),
});

export type TaskCapabilityManifestJson = z.infer<typeof taskCapabilityManifestSchema>;

export function parseTaskManifest(input: unknown): TaskCapabilityManifestJson {
  return taskCapabilityManifestSchema.parse(input);
}
