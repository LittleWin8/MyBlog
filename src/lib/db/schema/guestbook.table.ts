import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.table";
import { createdAt, id, updatedAt } from "./helper";

export const GUESTBOOK_STATUSES = ["published", "pending", "deleted"] as const;

export const GuestbookTable = sqliteTable(
  "guestbook",
  {
    id,
    content: text().notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    nickname: text(),
    rootId: integer("root_id").references(
      (): AnySQLiteColumn => GuestbookTable.id,
      { onDelete: "cascade" },
    ),
    replyToUserId: text("reply_to_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: GUESTBOOK_STATUSES })
      .notNull()
      .default("pending"),
    aiReason: text("ai_reason"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("guestbook_root_created_idx").on(table.rootId, table.createdAt),
    index("guestbook_user_created_idx").on(table.userId, table.createdAt),
    index("guestbook_status_created_idx").on(table.status, table.createdAt),
  ],
);

// ==================== types ====================
export type GuestbookEntry = typeof GuestbookTable.$inferSelect;
export type GuestbookStatus = (typeof GUESTBOOK_STATUSES)[number];
