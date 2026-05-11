import { and, count, desc, eq, isNull } from "drizzle-orm";
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
    .where(
      and(
        isNull(GuestbookTable.rootId),
        eq(GuestbookTable.status, "published"),
      ),
    )
    .orderBy(desc(GuestbookTable.createdAt))
    .limit(Math.min(limit, 100))
    .offset(offset);
}

export async function getRootEntriesCount(db: DB) {
  const result = await db
    .select({ count: count() })
    .from(GuestbookTable)
    .where(
      and(
        isNull(GuestbookTable.rootId),
        eq(GuestbookTable.status, "published"),
      ),
    );
  return result[0].count;
}

export async function getReplyCountByRootId(db: DB, rootId: number) {
  const result = await db
    .select({ count: count() })
    .from(GuestbookTable)
    .where(
      and(
        eq(GuestbookTable.rootId, rootId),
        eq(GuestbookTable.status, "published"),
      ),
    );
  return result[0].count;
}

export async function getRepliesByRootId(
  db: DB,
  rootId: number,
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
    .where(
      and(
        eq(GuestbookTable.rootId, rootId),
        eq(GuestbookTable.status, "published"),
      ),
    )
    .orderBy(GuestbookTable.createdAt)
    .limit(Math.min(limit, 100))
    .offset(offset);
}

export async function getRepliesByRootIdCount(db: DB, rootId: number) {
  const result = await db
    .select({ count: count() })
    .from(GuestbookTable)
    .where(
      and(
        eq(GuestbookTable.rootId, rootId),
        eq(GuestbookTable.status, "published"),
      ),
    );
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

  const conditions = [isNull(GuestbookTable.rootId)] as Array<
    ReturnType<typeof eq> | ReturnType<typeof isNull>
  >;

  if (status && status !== "ALL") {
    conditions.push(
      eq(GuestbookTable.status, status as "published" | "deleted"),
    );
  }

  return await db
    .select({
      id: GuestbookTable.id,
      content: GuestbookTable.content,
      userId: GuestbookTable.userId,
      nickname: GuestbookTable.nickname,
      rootId: GuestbookTable.rootId,
      replyToUserId: GuestbookTable.replyToUserId,
      status: GuestbookTable.status,
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
    .where(and(...conditions))
    .orderBy(desc(GuestbookTable.createdAt))
    .limit(Math.min(limit, 100))
    .offset(offset);
}

export async function getAllEntriesCount(
  db: DB,
  options: { status?: string } = {},
) {
  const { status } = options;

  const conditions = [isNull(GuestbookTable.rootId)] as Array<
    ReturnType<typeof eq> | ReturnType<typeof isNull>
  >;

  if (status && status !== "ALL") {
    conditions.push(
      eq(GuestbookTable.status, status as "published" | "deleted"),
    );
  }

  const result = await db
    .select({ count: count() })
    .from(GuestbookTable)
    .where(and(...conditions));

  return result[0].count;
}
