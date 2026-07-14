/**
 * CRM REST response schemas — genetic: ``sdk.crm.gen1``
 */

import { z } from 'zod';

export const crmContactSchema = z
  .object({
    id: z.string(),
    display_name: z.string().optional(),
    emails: z.array(z.string()).optional(),
    phones: z.array(z.string()).optional(),
    lifecycle: z.string().optional(),
    score: z.number().optional(),
    company_id: z.string().optional(),
    owner_user_id: z.number().optional(),
    rev: z.number().optional(),
  })
  .passthrough();

export const crmListContactsResponseSchema = z.object({
  contacts: z.array(crmContactSchema),
  total: z.number(),
  page: z.number().optional(),
  per_page: z.number().optional(),
});

export const crmDealSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    stage_id: z.string().optional(),
    pipeline_id: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    currency: z.string().optional(),
    contact_ids: z.array(z.string()).optional(),
    contact_summaries: z
      .array(
        z.object({
          id: z.string(),
          display_name: z.string().optional(),
          emails: z.array(z.string()).optional(),
        }),
      )
      .optional(),
    rev: z.number().optional(),
  })
  .passthrough();

export const crmBoardColumnSchema = z.object({
  stage: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      probability: z.number().optional(),
    })
    .optional(),
  deals: z.array(crmDealSchema).optional(),
  count: z.number().optional(),
  total_amount: z.string().optional(),
  weighted_amount: z.string().optional(),
});

export const crmBoardResponseSchema = z.object({
  pipeline: z.record(z.unknown()).optional(),
  columns: z.array(crmBoardColumnSchema).optional(),
});

export const crmTimelineItemSchema = z
  .object({
    kind: z.string(),
    id: z.string().optional(),
    ts: z.string().nullable().optional(),
    payload: z.record(z.unknown()).optional(),
    seq: z.number().optional(),
  })
  .passthrough();

export const crmDealTimelineResponseSchema = z.object({
  deal_id: z.string(),
  timeline: z.array(crmTimelineItemSchema),
});

export const crmContact360ResponseSchema = z.object({
  contact: crmContactSchema,
  deals: z.array(crmDealSchema).optional(),
  timeline: z.array(crmTimelineItemSchema).optional(),
  company: z.record(z.unknown()).nullable().optional(),
});

export type CrmContact = z.infer<typeof crmContactSchema>;
export type CrmDeal = z.infer<typeof crmDealSchema>;
export type CrmBoardResponse = z.infer<typeof crmBoardResponseSchema>;
export type CrmTimelineItem = z.infer<typeof crmTimelineItemSchema>;

export function parseCrmListContactsResponse(data: unknown) {
  return crmListContactsResponseSchema.parse(data);
}

export function parseCrmBoardResponse(data: unknown) {
  return crmBoardResponseSchema.parse(data);
}

export function parseCrmContact360Response(data: unknown) {
  return crmContact360ResponseSchema.parse(data);
}

export function parseCrmDealTimelineResponse(data: unknown) {
  return crmDealTimelineResponseSchema.parse(data);
}
