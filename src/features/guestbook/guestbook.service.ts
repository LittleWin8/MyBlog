import { resolveSystemConfig } from "@/features/config/config.service";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as GuestbookRepo from "@/features/guestbook/data/guestbook.data";
import type {
  CreateGuestbookInput,
  DeleteGuestbookInput,
  GetGuestbookInput,
  GetMyEntriesInput,
} from "@/features/guestbook/guestbook.schema";
import { sendGuestbookReplyNotification } from "@/features/guestbook/workflows/helpers";
import { publishNotificationEvent } from "@/features/notification/service/notification.publisher";
import { serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/errors";

// ============ Public Service Methods ============

export async function getRootEntries(
  context: DbContext,
  data: GetGuestbookInput & { viewerId?: string },
) {
  const [items, total] = await Promise.all([
    GuestbookRepo.getRootEntries(context.db, {
      offset: data.offset,
      limit: data.limit,
      viewerId: data.viewerId,
      status: data.viewerId ? undefined : ["published"],
    }),
    GuestbookRepo.getRootEntriesCount(context.db, {
      viewerId: data.viewerId,
      status: data.viewerId ? undefined : ["published"],
    }),
  ]);

  const itemsWithReplyCount = await Promise.all(
    items.map(async (item) => {
      const replyCount = await GuestbookRepo.getReplyCountByRootId(
        context.db,
        item.id,
        {
          viewerId: data.viewerId,
          status: data.viewerId ? undefined : ["published"],
        },
      );
      return { ...item, replyCount };
    }),
  );

  return { items: itemsWithReplyCount, total };
}

export async function getRepliesByRootId(
  context: DbContext,
  data: { rootId: number; offset?: number; limit?: number } & {
    viewerId?: string;
  },
) {
  const [items, total] = await Promise.all([
    GuestbookRepo.getRepliesByRootId(context.db, data.rootId, {
      offset: data.offset,
      limit: data.limit,
      viewerId: data.viewerId,
      status: data.viewerId ? undefined : ["published"],
    }),
    GuestbookRepo.getRepliesByRootIdCount(context.db, data.rootId, {
      viewerId: data.viewerId,
      status: data.viewerId ? undefined : ["published"],
    }),
  ]);

  return { items, total };
}

// ============ Authed User Service Methods ============

export async function createEntry(
  context: DbContext & {
    session: {
      user: { id: string; name?: string | null; role?: string | null };
    } | null;
    executionCtx: ExecutionContext;
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
  let replyToUserId: string | null = null;
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
    // Server-side derivation: notify the root entry's author (never trust client)
    replyToUserId = rootEntry.userId;
  }

  const session = context.session;
  const userId = session?.user.id ?? null;

  // Anonymous users must provide a nickname
  if (!userId && !data.nickname) {
    return err({ reason: "NICKNAME_REQUIRED" });
  }

  const isAdmin = session?.user.role === "admin";

  const entry = await GuestbookRepo.insertEntry(context.db, {
    content: data.content,
    userId,
    nickname: userId ? null : data.nickname,
    rootId,
    replyToUserId,
    // Admin entries are published immediately, others pending manual review
    status: isAdmin ? "published" : "pending",
  });

  // Send reply notification for admin replies
  if (isAdmin && rootId) {
    await sendGuestbookReplyNotification(context, {
      entry: {
        id: entry.id,
        rootId: entry.rootId,
        replyToUserId: entry.replyToUserId,
        userId: entry.userId,
        nickname: entry.nickname,
        content: data.content,
      },
    });
  }

  // Notify admin about new root entries from non-admin users only
  const isRootEntry = rootId === null;
  if (!isAdmin && isRootEntry) {
    const { ADMIN_EMAIL, DOMAIN } = serverEnv(context.env);
    const entryPreview = data.content.slice(0, 100);
    const submitterName = session?.user.name ?? data.nickname ?? "匿名用户";
    await publishNotificationEvent(context, {
      type: "guestbook.admin_new_entry",
      data: {
        to: ADMIN_EMAIL,
        submitterName,
        entryPreview: `${entryPreview}${entryPreview.length >= 100 ? "..." : ""}`,
        entryUrl: `https://${DOMAIN}/guestbook?highlightEntryId=${entry.id}&rootId=${entry.id}#entry-${entry.id}`,
      },
    });
  }

  return ok(entry);
}

export async function deleteEntry(
  context: AuthContext,
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

// ============ Authed User: My Entries ============

export async function getMyEntries(
  context: AuthContext,
  data: GetMyEntriesInput,
) {
  const [items, total] = await Promise.all([
    GuestbookRepo.getEntriesByUserId(context.db, context.session.user.id, {
      offset: data.offset,
      limit: data.limit,
    }),
    GuestbookRepo.getEntriesByUserIdCount(context.db, context.session.user.id),
  ]);

  return { items, total };
}

// ============ Admin Service Methods ============

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

export async function moderateEntry(
  context: DbContext & { executionCtx: ExecutionContext },
  data: { id: number; status: "published" | "pending" | "deleted" },
  moderatorUserId?: string,
) {
  const entry = await GuestbookRepo.findEntryById(context.db, data.id);
  if (!entry) return err({ reason: "ENTRY_NOT_FOUND" });

  const updatedEntry = await GuestbookRepo.updateEntry(context.db, data.id, {
    status: data.status,
  });

  // Send reply notification when manually approving a reply entry
  // Guard: only on first approval (entry.status !== "published") to prevent duplicates
  if (
    data.status === "published" &&
    entry.status !== "published" &&
    entry.replyToUserId
  ) {
    await sendGuestbookReplyNotification(context, {
      entry: {
        id: entry.id,
        rootId: entry.rootId,
        replyToUserId: entry.replyToUserId,
        userId: entry.userId,
        nickname: entry.nickname,
        content: entry.content,
      },
      skipNotifyUserId: moderatorUserId,
    });
  }

  return ok(updatedEntry);
}

export async function adminDeleteEntry(
  context: DbContext,
  data: DeleteGuestbookInput,
) {
  const entry = await GuestbookRepo.findEntryById(context.db, data.id);
  if (!entry) return err({ reason: "ENTRY_NOT_FOUND" });

  // Hard delete for admin
  await GuestbookRepo.deleteEntry(context.db, data.id);
  return ok({ success: true });
}

// ============ Helper Methods ============

export async function findEntryById(context: DbContext, entryId: number) {
  return await GuestbookRepo.findEntryById(context.db, entryId);
}

export async function getUserEntryStats(context: DbContext, userId: string) {
  return await GuestbookRepo.getUserEntryStats(context.db, userId);
}
