import { createServerFn } from "@tanstack/react-start";
import {
  AdminGetGuestbookInputSchema,
  DeleteGuestbookInputSchema,
  ModerateGuestbookInputSchema,
} from "@/features/guestbook/guestbook.schema";
import * as GuestbookService from "@/features/guestbook/guestbook.service";
import { adminMiddleware } from "@/lib/middlewares";

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
