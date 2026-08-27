import {
  createAdminTestContext,
  createMockExecutionCtx,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  type SystemConfig,
} from "@/features/config/config.schema";
import * as ConfigService from "@/features/config/config.service";
import * as ConfigRepo from "@/features/config/data/config.data";
import { unwrap } from "@/lib/errors";

describe("Config Integration", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;

  beforeEach(async () => {
    adminContext = createAdminTestContext({
      executionCtx: createMockExecutionCtx(),
    });
    await seedUser(adminContext.db, adminContext.session.user);
    await ConfigRepo.upsertSystemConfig(adminContext.db, DEFAULT_CONFIG);
  });

  describe("resolveSystemConfig", () => {
    it("should return defaults when config is null", () => {
      const config = ConfigService.resolveSystemConfig(null);

      expect(config.feature?.commentsEnabled).toBe(true);
      expect(config.feature?.guestbookEnabled).toBe(true);
      expect(config.email?.host).toBe("");
    });

    it("should merge stored config with defaults", () => {
      const stored: SystemConfig = {
        feature: { commentsEnabled: false },
      };

      const config = ConfigService.resolveSystemConfig(stored);

      expect(config.feature?.commentsEnabled).toBe(false);
      expect(config.feature?.guestbookEnabled).toBe(true);
    });

    it("should preserve explicit true values", () => {
      const stored: SystemConfig = {
        feature: { commentsEnabled: true, guestbookEnabled: true },
      };

      const config = ConfigService.resolveSystemConfig(stored);

      expect(config.feature?.commentsEnabled).toBe(true);
      expect(config.feature?.guestbookEnabled).toBe(true);
    });
  });

  describe("getSystemConfig", () => {
    it("should return resolved config from DB", async () => {
      const config = await ConfigService.getSystemConfig(adminContext);

      expect(config.feature?.commentsEnabled).toBe(true);
      expect(config.feature?.guestbookEnabled).toBe(true);
    });
  });

  describe("updateSystemConfig", () => {
    it("should update config and return success", async () => {
      const result = await ConfigService.updateSystemConfig(adminContext, {
        ...DEFAULT_CONFIG,
        feature: { commentsEnabled: false, guestbookEnabled: false },
      });

      expect(result.data?.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it("should persist config changes", async () => {
      unwrap(
        await ConfigService.updateSystemConfig(adminContext, {
          ...DEFAULT_CONFIG,
          feature: { commentsEnabled: false, guestbookEnabled: true },
        }),
      );

      const config = await ConfigService.getSystemConfig(adminContext);

      expect(config.feature?.commentsEnabled).toBe(false);
      expect(config.feature?.guestbookEnabled).toBe(true);
    });
  });
});
