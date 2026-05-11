import { createServerFn } from "@tanstack/react-start";
import {
  CreateGuestbookInputSchema,
  DeleteGuestbookInputSchema,
  GetGuestbookInputSchema,
  GetRepliesInputSchema,
} from "@/features/guestbook/guestbook.schema";
import * as GuestbookService from "@/features/guestbook/guestbook.service";
import {
  authMiddleware,
  createRateLimitMiddleware,
  dbMiddleware,
  sessionMiddleware,
  turnstileMiddleware,
} from "@/lib/middlewares";

export const getGuestbookEntriesFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(GetGuestbookInputSchema)
  .handler(async ({ data, context }) => {
    return await GuestbookService.getRootEntries(context, data);
  });

export const getGuestbookRepliesFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(GetRepliesInputSchema)
  .handler(async ({ data, context }) => {
    return await GuestbookService.getRepliesByRootId(context, data);
  });

export const createGuestbookEntryFn = createServerFn({ method: "POST" })
  .middleware([
    createRateLimitMiddleware({
      capacity: 10,
      interval: "1m",
      key: "guestbook:create",
    }),
    turnstileMiddleware,
    sessionMiddleware,
  ])
  .inputValidator(CreateGuestbookInputSchema)
  .handler(async ({ data, context }) => {
    return await GuestbookService.createEntry(context, data);
  });

export const createAnonymousGuestbookEntryFn = createServerFn({
  method: "POST",
})
  .middleware([
    createRateLimitMiddleware({
      capacity: 5,
      interval: "1m",
      key: "guestbook:create-anon",
    }),
    turnstileMiddleware,
    dbMiddleware,
  ])
  .inputValidator(CreateGuestbookInputSchema)
  .handler(async ({ data, context }) => {
    return await GuestbookService.createEntry(
      { ...context, session: null },
      data,
    );
  });

export const deleteGuestbookEntryFn = createServerFn({ method: "POST" })
  .middleware([
    createRateLimitMiddleware({
      capacity: 10,
      interval: "1m",
      key: "guestbook:delete",
    }),
    authMiddleware,
  ])
  .inputValidator(DeleteGuestbookInputSchema)
  .handler(async ({ data, context }) => {
    return await GuestbookService.deleteEntry(context, data);
  });
