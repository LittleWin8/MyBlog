import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DeleteGuestbookInputSchema } from "@/features/guestbook/guestbook.schema";
import * as GuestbookService from "@/features/guestbook/guestbook.service";
import { adminMiddleware } from "@/lib/middlewares";

const AdminGetGuestbookInputSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  status: z.string().optional(),
});

const ModerateGuestbookInputSchema = z.object({
  id: z.number(),
  status: z.enum(["published", "deleted"]),
});

export const adminGetGuestbookEntriesFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(AdminGetGuestbookInputSchema)
  .handler(async ({ data, context }) => {
    return await GuestbookService.getAllEntries(context, data);
  });

export const moderateGuestbookEntryFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(ModerateGuestbookInputSchema)
  .handler(async ({ data, context }) => {
    return await GuestbookService.moderateEntry(context, data);
  });

export const adminDeleteGuestbookEntryFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(DeleteGuestbookInputSchema)
  .handler(async ({ data, context }) => {
    return await GuestbookService.adminDeleteEntry(context, data);
  });
