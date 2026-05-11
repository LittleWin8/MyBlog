import * as ConfigRepo from "@/features/config/data/config.data";
import { resolveSystemConfig } from "@/features/config/service/config.service";
import * as GuestbookRepo from "@/features/guestbook/data/guestbook.data";
import type {
  CreateGuestbookInput,
  DeleteGuestbookInput,
  GetGuestbookInput,
} from "@/features/guestbook/guestbook.schema";
import { err, ok } from "@/lib/errors";

export async function getRootEntries(
  context: DbContext,
  data: GetGuestbookInput,
) {
  const [items, total] = await Promise.all([
    GuestbookRepo.getRootEntries(context.db, {
      offset: data.offset,
      limit: data.limit,
    }),
    GuestbookRepo.getRootEntriesCount(context.db),
  ]);

  const itemsWithReplyCount = await Promise.all(
    items.map(async (item) => {
      const replyCount = await GuestbookRepo.getReplyCountByRootId(
        context.db,
        item.id,
      );
      return { ...item, replyCount };
    }),
  );

  return { items: itemsWithReplyCount, total };
}

export async function getRepliesByRootId(
  context: DbContext,
  data: { rootId: number; offset?: number; limit?: number },
) {
  const [items, total] = await Promise.all([
    GuestbookRepo.getRepliesByRootId(context.db, data.rootId, {
      offset: data.offset,
      limit: data.limit,
    }),
    GuestbookRepo.getRepliesByRootIdCount(context.db, data.rootId),
  ]);

  return { items, total };
}

export async function createEntry(
  context: DbContext & {
    session: { user: { id: string; role?: string | null } } | null;
  },
  data: CreateGuestbookInput,
) {
  // Check feature toggle
  const rawConfig = await ConfigRepo.getSystemConfig(context.db);
  const config = resolveSystemConfig(rawConfig);
  if (config.feature?.guestbookEnabled === false) {
    return err({ reason: "FEATURE_DISABLED" });
  }

  // Validate rootId if it's a reply
  let rootId: number | null = null;
  if (data.rootId) {
    const rootEntry = await GuestbookRepo.findEntryById(
      context.db,
      data.rootId,
    );
    if (!rootEntry) {
      return err({ reason: "ROOT_ENTRY_NOT_FOUND" });
    }
    if (rootEntry.rootId !== null) {
      return err({ reason: "INVALID_ROOT_ID" });
    }
    rootId = data.rootId;
  }

  const session = context.session;
  const userId = session?.user.id ?? null;

  // Anonymous users must provide a nickname
  if (!userId && !data.nickname) {
    return err({ reason: "NICKNAME_REQUIRED" });
  }

  const entry = await GuestbookRepo.insertEntry(context.db, {
    content: data.content,
    userId,
    nickname: userId ? null : data.nickname,
    rootId,
    replyToUserId: data.replyToUserId ?? null,
    status: "published",
  });

  return ok(entry);
}

export async function deleteEntry(
  context: DbContext & {
    session: { user: { id: string; role?: string | null } };
  },
  data: DeleteGuestbookInput,
) {
  const entry = await GuestbookRepo.findEntryById(context.db, data.id);

  if (!entry) {
    return err({ reason: "ENTRY_NOT_FOUND" });
  }

  const userRole = context.session.user.role;
  const isOwner = entry.userId === context.session.user.id;

  if (!isOwner && userRole !== "admin") {
    return err({ reason: "PERMISSION_DENIED" });
  }

  // Soft delete
  await GuestbookRepo.updateEntry(context.db, data.id, {
    status: "deleted",
  });

  return ok({ success: true });
}

// Admin: get all entries with status filter
export async function getAllEntries(
  context: DbContext,
  data: { offset?: number; limit?: number; status?: string },
) {
  const [items, total] = await Promise.all([
    GuestbookRepo.getAllEntries(context.db, {
      offset: data.offset,
      limit: data.limit,
      status: data.status,
    }),
    GuestbookRepo.getAllEntriesCount(context.db, {
      status: data.status,
    }),
  ]);

  const itemsWithReplyCount = await Promise.all(
    items.map(async (item) => {
      const replyCount = await GuestbookRepo.getReplyCountByRootId(
        context.db,
        item.id,
      );
      return { ...item, replyCount };
    }),
  );

  return { items: itemsWithReplyCount, total };
}

// Admin: moderate entry (change status)
export async function moderateEntry(
  context: DbContext,
  data: { id: number; status: "published" | "deleted" },
) {
  const entry = await GuestbookRepo.findEntryById(context.db, data.id);
  if (!entry) return err({ reason: "ENTRY_NOT_FOUND" });

  await GuestbookRepo.updateEntry(context.db, data.id, {
    status: data.status,
  });

  return ok({ success: true });
}

// Admin: hard delete entry
export async function adminDeleteEntry(
  context: DbContext,
  data: DeleteGuestbookInput,
) {
  const entry = await GuestbookRepo.findEntryById(context.db, data.id);
  if (!entry) return err({ reason: "ENTRY_NOT_FOUND" });

  await GuestbookRepo.deleteEntry(context.db, data.id);
  return ok({ success: true });
}
