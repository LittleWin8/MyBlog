import {
  createAdminTestContext,
  createAuthTestContext,
  createMockExecutionCtx,
  createMockSession,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as GuestbookService from "@/features/guestbook/guestbook.service";
import { unwrap } from "@/lib/errors";

describe("Guestbook Integration", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;
  let userContext: ReturnType<typeof createAuthTestContext>;

  beforeEach(async () => {
    adminContext = createAdminTestContext({
      executionCtx: createMockExecutionCtx(),
    });
    await seedUser(adminContext.db, adminContext.session.user);

    const userSession = createMockSession({
      user: {
        id: "user-1",
        name: "Test User",
        email: "user@example.com",
        role: null,
      },
    });
    userContext = createAuthTestContext({
      session: userSession,
      executionCtx: createMockExecutionCtx(),
    });
    await seedUser(userContext.db, userSession.user);

    await ConfigRepo.upsertSystemConfig(adminContext.db, DEFAULT_CONFIG);
  });

  describe("Entry Creation", () => {
    it("should create an entry with pending status for non-admin user", async () => {
      const entry = unwrap(
        await GuestbookService.createEntry(userContext, {
          content: "Hello, this is a test message!",
        }),
      );

      expect(entry.content).toBe("Hello, this is a test message!");
      expect(entry.userId).toBe("user-1");
      expect(entry.nickname).toBeNull();
      expect(entry.status).toBe("pending");
    });

    it("should create an entry with published status for admin user", async () => {
      const entry = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Admin message",
        }),
      );

      expect(entry.status).toBe("published");
    });

    it("should create an entry with pending status for anonymous user", async () => {
      const anonContext = {
        env: adminContext.env,
        db: adminContext.db,
        session: null,
        executionCtx: createMockExecutionCtx(),
      };

      const entry = unwrap(
        await GuestbookService.createEntry(anonContext, {
          content: "Anonymous message",
          nickname: "Guest123",
        }),
      );

      expect(entry.userId).toBeNull();
      expect(entry.nickname).toBe("Guest123");
      expect(entry.status).toBe("pending");
    });

    it("should return NICKNAME_REQUIRED for anonymous user without nickname", async () => {
      const anonContext = {
        env: adminContext.env,
        db: adminContext.db,
        session: null,
        executionCtx: createMockExecutionCtx(),
      };

      const result = await GuestbookService.createEntry(anonContext, {
        content: "Anonymous message without name",
      });

      expect(result.error?.reason).toBe("NICKNAME_REQUIRED");
    });

    it("should return FEATURE_DISABLED when guestbook is closed", async () => {
      await ConfigRepo.upsertSystemConfig(adminContext.db, {
        ...DEFAULT_CONFIG,
        feature: { guestbookEnabled: false, commentsEnabled: true },
      });

      const result = await GuestbookService.createEntry(userContext, {
        content: "Should be blocked",
      });

      expect(result.error?.reason).toBe("FEATURE_DISABLED");
    });

    it("should create a reply to an existing entry", async () => {
      const root = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Root message",
        }),
      );

      const reply = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Reply to root",
          rootId: root.id,
        }),
      );

      expect(reply.rootId).toBe(root.id);
    });

    it("should return ROOT_ENTRY_NOT_FOUND when replying to non-existent entry", async () => {
      const result = await GuestbookService.createEntry(userContext, {
        content: "Reply to nothing",
        rootId: 999999,
      });

      expect(result.error?.reason).toBe("ROOT_ENTRY_NOT_FOUND");
    });

    it("should return INVALID_ROOT_ID when rootId is itself a reply", async () => {
      const root = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Root",
        }),
      );

      const reply = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Reply",
          rootId: root.id,
        }),
      );

      const result = await GuestbookService.createEntry(userContext, {
        content: "Nested reply",
        rootId: reply.id,
      });

      expect(result.error?.reason).toBe("INVALID_ROOT_ID");
    });
  });

  describe("ViewerId Pattern", () => {
    it("should show own pending entries to the viewer", async () => {
      const entry = unwrap(
        await GuestbookService.createEntry(userContext, {
          content: "My pending entry",
        }),
      );
      expect(entry.status).toBe("pending");

      // User should see their own pending entry
      const result = await GuestbookService.getRootEntries(userContext, {
        viewerId: "user-1",
      });

      expect(result.items.some((e) => e.id === entry.id)).toBe(true);
    });

    it("should not show other users pending entries", async () => {
      unwrap(
        await GuestbookService.createEntry(userContext, {
          content: "Other user pending entry",
        }),
      );

      const otherSession = createMockSession({
        user: {
          id: "user-2",
          name: "Other",
          email: "other@example.com",
          role: null,
        },
      });
      const otherContext = createAuthTestContext({
        session: otherSession,
        executionCtx: createMockExecutionCtx(),
      });
      await seedUser(otherContext.db, otherSession.user);

      // Other user should not see the pending entry
      const result = await GuestbookService.getRootEntries(otherContext, {
        viewerId: "user-2",
      });

      expect(result.items).toHaveLength(0);
    });
  });

  describe("Entry Deletion", () => {
    it("should allow user to delete own entry", async () => {
      const entry = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "My entry",
        }),
      );

      const result = await GuestbookService.deleteEntry(adminContext, {
        id: entry.id,
      });

      expect(result.error).toBeNull();

      const deleted = await GuestbookService.getAllEntries(adminContext, {});
      const found = deleted.items.find((e) => e.id === entry.id);
      expect(found?.status).toBe("deleted");
    });

    it("should return PERMISSION_DENIED when deleting another user's entry", async () => {
      const entry = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Admin entry",
        }),
      );

      const otherSession = createMockSession({
        user: {
          id: "user-2",
          name: "Other",
          email: "other@example.com",
          role: null,
        },
      });
      const otherContext = createAuthTestContext({
        session: otherSession,
        executionCtx: createMockExecutionCtx(),
      });
      await seedUser(otherContext.db, otherSession.user);

      const result = await GuestbookService.deleteEntry(otherContext, {
        id: entry.id,
      });

      expect(result.error?.reason).toBe("PERMISSION_DENIED");
    });

    it("should allow admin to delete any entry", async () => {
      const entry = unwrap(
        await GuestbookService.createEntry(userContext, {
          content: "User entry",
        }),
      );

      const result = await GuestbookService.deleteEntry(adminContext, {
        id: entry.id,
      });

      expect(result.error).toBeNull();
    });

    it("should return ENTRY_NOT_FOUND when deleting non-existent entry", async () => {
      const result = await GuestbookService.deleteEntry(userContext, {
        id: 999999,
      });

      expect(result.error?.reason).toBe("ENTRY_NOT_FOUND");
    });
  });

  describe("Public Queries", () => {
    it("should get published root entries with reply counts", async () => {
      const root = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Root entry",
        }),
      );

      unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Reply",
          rootId: root.id,
        }),
      );

      const result = await GuestbookService.getRootEntries(userContext, {});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(root.id);
      expect(result.items[0].replyCount).toBe(1);
    });

    it("should get replies by root ID with pagination", async () => {
      const root = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Root",
        }),
      );

      for (let i = 1; i <= 3; i++) {
        unwrap(
          await GuestbookService.createEntry(adminContext, {
            content: `Reply ${i}`,
            rootId: root.id,
          }),
        );
      }

      const page1 = await GuestbookService.getRepliesByRootId(userContext, {
        rootId: root.id,
        limit: 2,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(3);

      const page2 = await GuestbookService.getRepliesByRootId(userContext, {
        rootId: root.id,
        limit: 2,
        offset: 2,
      });

      expect(page2.items).toHaveLength(1);
    });
  });

  describe("Moderation", () => {
    it("should allow admin to moderate entry status", async () => {
      const entry = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Published entry",
        }),
      );

      unwrap(
        await GuestbookService.moderateEntry(adminContext, {
          id: entry.id,
          status: "deleted",
        }),
      );

      const result = await GuestbookService.getAllEntries(adminContext, {
        status: "deleted",
      });

      expect(result.items.some((e) => e.id === entry.id)).toBe(true);
    });

    it("should allow admin to set pending status", async () => {
      const entry = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "Some entry",
        }),
      );

      unwrap(
        await GuestbookService.moderateEntry(adminContext, {
          id: entry.id,
          status: "pending",
        }),
      );

      const result = await GuestbookService.getAllEntries(adminContext, {
        status: "pending",
      });

      expect(result.items.some((e) => e.id === entry.id)).toBe(true);
    });

    it("should allow admin to hard delete entry", async () => {
      const entry = unwrap(
        await GuestbookService.createEntry(adminContext, {
          content: "To be hard deleted",
        }),
      );

      unwrap(
        await GuestbookService.adminDeleteEntry(adminContext, {
          id: entry.id,
        }),
      );

      const result = await GuestbookService.getAllEntries(adminContext, {});
      expect(result.items.find((e) => e.id === entry.id)).toBeUndefined();
    });
  });
});
