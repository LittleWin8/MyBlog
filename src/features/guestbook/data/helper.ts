import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { GuestbookStatus } from "@/lib/db/schema";
import { GuestbookTable } from "@/lib/db/schema";

export function buildGuestbookWhereClause(options: {
  status?: GuestbookStatus | Array<GuestbookStatus>;
  userId?: string;
  viewerId?: string;
  rootId?: number | null;
  rootOnly?: boolean;
}) {
  const { status, userId, viewerId, rootId, rootOnly } = options;

  const whereClauses = [];

  if (userId) {
    whereClauses.push(eq(GuestbookTable.userId, userId));
  }

  if (rootOnly) {
    whereClauses.push(isNull(GuestbookTable.rootId));
  } else if (rootId !== undefined) {
    if (rootId === null) {
      whereClauses.push(isNull(GuestbookTable.rootId));
    } else {
      whereClauses.push(eq(GuestbookTable.rootId, rootId));
    }
  }

  // logic:
  // 1. If viewerId is provided, we want (status: published) OR (userId: viewerId AND status: pending)
  // 2. If status is explicitly provided, we use that.

  if (viewerId && !status && !userId) {
    whereClauses.push(
      or(
        inArray(GuestbookTable.status, ["published"]),
        and(
          eq(GuestbookTable.userId, viewerId),
          inArray(GuestbookTable.status, ["pending"]),
        ),
      ),
    );
  } else if (status) {
    if (Array.isArray(status)) {
      whereClauses.push(inArray(GuestbookTable.status, status));
    } else {
      whereClauses.push(eq(GuestbookTable.status, status));
    }
  }

  return whereClauses.length > 0 ? and(...whereClauses) : undefined;
}
