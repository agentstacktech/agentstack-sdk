import { z } from 'zod';

export const PathStepHelpBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('prose'),
    bodyKey: z.string().optional(),
    bodyDefault: z.string(),
  }),
  z.object({
    type: z.literal('recipe'),
    narrativeId: z.string(),
    recipeId: z.string(),
  }),
  z.object({
    type: z.literal('doc'),
    excerptId: z.string(),
  }),
  z.object({
    type: z.literal('callout'),
    tone: z.enum(['info', 'warn']),
    bodyKey: z.string().optional(),
    bodyDefault: z.string(),
  }),
  z.object({
    type: z.literal('checklist'),
    items: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
]);

export type PathStepHelpBlock = z.infer<typeof PathStepHelpBlockSchema>;

export const GoalVerifySpecSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('hostingSitePublished'), minSites: z.number().optional() }),
  z.object({ kind: z.literal('hostedVitrinePublished') }),
  z.object({ kind: z.literal('commerceSellerActivated') }),
  z.object({ kind: z.literal('integrationConnectionActive'), minCount: z.number().optional() }),
  z.object({ kind: z.literal('paymentWebhookOk') }),
  z.object({ kind: z.literal('botExists'), minCount: z.number().optional() }),
  z.object({ kind: z.literal('botLive'), minCount: z.number().optional() }),
  z.object({ kind: z.literal('botChannelAttached'), minCount: z.number().optional() }),
  z.object({ kind: z.literal('manualConfirm'), checklistKeys: z.array(z.string()) }),
]);

export type GoalVerifySpec = z.infer<typeof GoalVerifySpecSchema>;
