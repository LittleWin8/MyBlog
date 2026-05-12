import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseSiteAssetUploadInput } from "@/features/config/config.asset.schema";
import { SystemConfigSchema } from "@/features/config/config.schema";
import * as ConfigService from "@/features/config/config.service";
import { resolveSystemConfig } from "@/features/config/config.service";
import * as ConfigRepo from "@/features/config/data/config.data";
import { adminMiddleware, dbMiddleware } from "@/lib/middlewares";
import { m } from "@/paraglide/messages";

export const getFeatureConfigFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    const raw = await ConfigRepo.getSystemConfig(context.db);
    const config = resolveSystemConfig(raw);
    return config.feature ?? { commentsEnabled: true, guestbookEnabled: true };
  });

export const getSystemConfigFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(({ context }) => ConfigService.getSystemConfig(context));

export const updateSystemConfigFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(SystemConfigSchema)
  .handler(({ context, data }) =>
    ConfigService.updateSystemConfig(context, data),
  );

const SiteAssetUploadInputSchema = z.instanceof(FormData);

export const uploadSiteAssetFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(SiteAssetUploadInputSchema)
  .handler(async ({ data, context }) => {
    const input = parseSiteAssetUploadInput(data, m);
    return ConfigService.uploadSiteAsset(context, input);
  });
