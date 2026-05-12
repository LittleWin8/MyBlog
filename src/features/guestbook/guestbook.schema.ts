import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { GuestbookTable } from "@/lib/db/schema";

const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);

export const GuestbookSelectSchema = createSelectSchema(GuestbookTable, {
  createdAt: coercedDate,
  updatedAt: coercedDate,
});
export const GuestbookInsertSchema = createInsertSchema(GuestbookTable);
export const GuestbookUpdateSchema = createUpdateSchema(GuestbookTable);

// User info schema for joined queries
export const GuestbookUserSchema = z.object({
  id: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

export const GuestbookWithUserSchema = GuestbookSelectSchema.extend({
  user: GuestbookUserSchema.nullable(),
  replyToUser: z
    .object({
      id: z.string().nullable(),
      name: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export const GuestbookWithReplyCountSchema = GuestbookWithUserSchema.extend({
  replyCount: z.number(),
});

// Public API Schemas
export const GetGuestbookInputSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
});

export const GetGuestbookResponseSchema = z.object({
  items: z.array(GuestbookWithReplyCountSchema),
  total: z.number(),
});

export const GetRepliesInputSchema = z.object({
  rootId: z.number(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});

export const GetRepliesResponseSchema = z.object({
  items: z.array(GuestbookWithUserSchema),
  total: z.number(),
});

export const CreateGuestbookInputSchema = z.object({
  content: z.string().min(1).max(1000),
  nickname: z.string().max(20).optional(),
  rootId: z.number().optional(),
  replyToUserId: z.string().optional(),
});

export const DeleteGuestbookInputSchema = z.object({
  id: z.number(),
});

// Admin API Schemas
export const AdminGetGuestbookInputSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  status: z.string().optional(),
});

export const ModerateGuestbookInputSchema = z.object({
  id: z.number(),
  status: z.enum(["published", "deleted"]),
});

// Types
export type GuestbookWithUser = z.infer<typeof GuestbookWithUserSchema>;
export type GuestbookWithReplyCount = z.infer<
  typeof GuestbookWithReplyCountSchema
>;
export type GetGuestbookInput = z.infer<typeof GetGuestbookInputSchema>;
export type CreateGuestbookInput = z.infer<typeof CreateGuestbookInputSchema>;
export type DeleteGuestbookInput = z.infer<typeof DeleteGuestbookInputSchema>;
export type AdminGetGuestbookInput = z.infer<typeof AdminGetGuestbookInputSchema>;
export type ModerateGuestbookInput = z.infer<typeof ModerateGuestbookInputSchema>;
