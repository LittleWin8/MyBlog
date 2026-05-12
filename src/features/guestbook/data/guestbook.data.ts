import { and, count, desc, eq, isNull } from "drizzle-orm";
import { buildGuestbookWhereClause } from "@/features/guestbook/data/helper";
import type { GuestbookStatus } from "@/lib/db/schema";
import { GuestbookTable, user } from "@/lib/db/schema";

const DEFAULT_PAGE_SIZE = 20;

export async function insertEntry(
  db: DB,
  data: typeof GuestbookTable.$inferInsert,
) {
  const [entry] = await db.insert(GuestbookTable).values(data).returning();
  return entry;
}

export async function findEntryById(db: DB, id: number) {
  return await db.query.GuestbookTable.findFirst({
    where: eq(GuestbookTable.id, id),
  });
}

export async function getRootEntries(
  db: DB,
  options: {
    offset?: number;
    limit?: number;
    status?: GuestbookStatus | Array<GuestbookStatus>;
    viewerId?: string;
  } = {},
) {
  const { offset = 0, limit = DEFAULT_PAGE_SIZE, status, viewerId } = options;

  const conditions = buildGuestbookWhereClause({
    status,
    viewerId,
    rootOnly: true,
  });

  return await db
    .select({
      id: GuestbookTable.id,
      content: GuestbookTable.content,
      userId: GuestbookTable.userId,
      nickname: GuestbookTable.nickname,
      rootId: GuestbookTable.rootId,
      replyToUserId: GuestbookTable.replyToUserId,
      status: GuestbookTable.status,
      aiReason: GuestbookTable.aiReason,
      createdAt: GuestbookTable.createdAt,
      updatedAt: GuestbookTable.updatedAt,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(GuestbookTable)
    .leftJoin(user, eq(GuestbookTable.userId, user.id))
    .where(conditions)
    .orderBy(desc(GuestbookTable.createdAt))
    .limit(Math.min(limit, 100))
    .offset(offset);
}

export async function getRootEntriesCount(
  db: DB,
  options: {
    status?: GuestbookStatus | Array<GuestbookStatus>;
    viewerId?: string;
  } = {},
) {
  const { status, viewerId } = options;

  const conditions = buildGuestbookWhereClause({
    status,
    viewerId,
    rootOnly: true,
  });

  const result = await db
    .select({ count: count() })
    .from(GuestbookTable)
    .where(conditions);
  return result[0].count;
}

export async function getReplyCountByRootId(
  db: DB,
  rootId: number,
  options: {
    status?: GuestbookStatus | Array<GuestbookStatus>;
    viewerId?: string;
  } = {},
) {
  const { status, viewerId } = options;

  const conditions = buildGuestbookWhereClause({
    rootId,
    status,
    viewerId,
  });

  const result = await db
    .select({ count: count() })
    .from(GuestbookTable)
    .where(conditions);
  return result[0].count;
}

export async function getRepliesByRootId(
  db: DB,
  rootId: number,
  options: {
    offset?: number;
    limit?: number;
    status?: GuestbookStatus | Array<GuestbookStatus>;
    viewerId?: string;
  } = {},
) {
  const { offset = 0, limit = DEFAULT_PAGE_SIZE, status, viewerId } = options;

  const conditions = buildGuestbookWhereClause({
    rootId,
    status,
    viewerId,
  });

  return await db
    .select({
      id: GuestbookTable.id,
      content: GuestbookTable.content,
      userId: GuestbookTable.userId,
      nickname: GuestbookTable.nickname,
      rootId: GuestbookTable.rootId,
      replyToUserId: GuestbookTable.replyToUserId,
      status: GuestbookTable.status,
      aiReason: GuestbookTable.aiReason,
      createdAt: GuestbookTable.createdAt,
      updatedAt: GuestbookTable.updatedAt,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(GuestbookTable)
    .leftJoin(user, eq(GuestbookTable.userId, user.id))
    .where(conditions)
    .orderBy(GuestbookTable.createdAt)
    .limit(Math.min(limit, 100))
    .offset(offset);
}

export async function getRepliesByRootIdCount(
  db: DB,
  rootId: number,
  options: {
    status?: GuestbookStatus | Array<GuestbookStatus>;
    viewerId?: string;
  } = {},
) {
  const { status, viewerId } = options;

  const conditions = buildGuestbookWhereClause({
    rootId,
    status,
    viewerId,
  });

  const result = await db
    .select({ count: count() })
    .from(GuestbookTable)
    .where(conditions);
  return result[0].count;
}

export async function updateEntry(
  db: DB,
  id: number,
  data: Partial<Omit<typeof GuestbookTable.$inferInsert, "id" | "createdAt">>,
) {
  const [entry] = await db
    .update(GuestbookTable)
    .set(data)
    .where(eq(GuestbookTable.id, id))
    .returning();
  return entry;
}

export async function deleteEntry(db: DB, id: number) {
  await db.delete(GuestbookTable).where(eq(GuestbookTable.id, id));
}

// Admin: list all entries (root only) with optional status filter
export async function getAllEntries(
  db: DB,
  options: {
    offset?: number;
    limit?: number;
    status?: string;
  } = {},
) {
  const { offset = 0, limit = DEFAULT_PAGE_SIZE, status } = options;

  const conditions = buildGuestbookWhereClause({
    status:
      status && status !== "ALL" ? (status as GuestbookStatus) : undefined,
    rootOnly: true,
  });

  return await db
    .select({
      id: GuestbookTable.id,
      content: GuestbookTable.content,
      userId: GuestbookTable.userId,
      nickname: GuestbookTable.nickname,
      rootId: GuestbookTable.rootId,
      replyToUserId: GuestbookTable.replyToUserId,
      status: GuestbookTable.status,
      aiReason: GuestbookTable.aiReason,
      createdAt: GuestbookTable.createdAt,
      updatedAt: GuestbookTable.updatedAt,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(GuestbookTable)
    .leftJoin(user, eq(GuestbookTable.userId, user.id))
    .where(conditions)
    .orderBy(desc(GuestbookTable.createdAt))
    .limit(Math.min(limit, 100))
    .offset(offset);
}

export async function getAllEntriesCount(
  db: DB,
  options: { status?: string } = {},
) {
  const { status } = options;

  const conditions = buildGuestbookWhereClause({
    status:
      status && status !== "ALL" ? (status as GuestbookStatus) : undefined,
    rootOnly: true,
  });

  const result = await db
    .select({ count: count() })
    .from(GuestbookTable)
    .where(conditions);

  return result[0].count;
}

// User: get own entries
export async function getEntriesByUserId(
  db: DB,
  userId: string,
  options: { offset?: number; limit?: number } = {},
) {
  const { offset = 0, limit = DEFAULT_PAGE_SIZE } = options;

  return await db
    .select({
      id: GuestbookTable.id,
      content: GuestbookTable.content,
      userId: GuestbookTable.userId,
      nickname: GuestbookTable.nickname,
      rootId: GuestbookTable.rootId,
      replyToUserId: GuestbookTable.replyToUserId,
      status: GuestbookTable.status,
      aiReason: GuestbookTable.aiReason,
      createdAt: GuestbookTable.createdAt,
      updatedAt: GuestbookTable.updatedAt,
    })
    .from(GuestbookTable)
    .where(eq(GuestbookTable.userId, userId))
    .orderBy(desc(GuestbookTable.createdAt))
    .limit(Math.min(limit, 100))
    .offset(offset);
}

export async function getEntriesByUserIdCount(db: DB, userId: string) {
  const result = await db
    .select({ count: count() })
    .from(GuestbookTable)
    .where(eq(GuestbookTable.userId, userId));
  return result[0].count;
}

// User stats
export async function getUserEntryStats(db: DB, userId: string) {
  const results = await db
    .select({
      status: GuestbookTable.status,
      count: count(),
    })
    .from(GuestbookTable)
    .where(eq(GuestbookTable.userId, userId))
    .groupBy(GuestbookTable.status);

  return results;
}

// Get entry author with email (for notifications)
export async function getEntryAuthorWithEmail(db: DB, entryId: number) {
  const result = await db
    .select({
      userId: GuestbookTable.userId,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
    })
    .from(GuestbookTable)
    .leftJoin(user, eq(GuestbookTable.userId, user.id))
    .where(eq(GuestbookTable.id, entryId))
    .limit(1);

  if (result.length === 0 || !result[0].userId) {
    return null;
  }

  return {
    id: result[0].userId,
    name: result[0].userName,
    email: result[0].userEmail,
    role: result[0].userRole,
  };
}

// Get user info by userId (for reply notifications)
export async function getUserById(db: DB, userId: string) {
  const result = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// Dashboard: count entries needing review
export async function getPendingEntriesCount(db: DB) {
  const [result] = await db
    .select({ count: count() })
    .from(GuestbookTable)
    .where(
      and(isNull(GuestbookTable.rootId), eq(GuestbookTable.status, "pending")),
    );
  return result.count;
}
