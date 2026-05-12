import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";
import * as AiService from "@/features/ai/ai.service";
import * as GuestbookRepo from "@/features/guestbook/data/guestbook.data";
import * as GuestbookService from "@/features/guestbook/guestbook.service";
import { sendGuestbookReplyNotification } from "@/features/guestbook/workflows/helpers";
import { publishNotificationEvent } from "@/features/notification/service/notification.publisher";
import { getDb } from "@/lib/db";
import { isNotInProduction, serverEnv } from "@/lib/env/server.env";
import { m } from "@/paraglide/messages";

interface Params {
  entryId: number;
}

export class GuestbookModerationWorkflow extends WorkflowEntrypoint<
  Env,
  Params
> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { entryId } = event.payload;
    const locale = serverEnv(this.env).LOCALE;

    // Step 1: Fetch the entry
    const entry = await step.do("fetch guestbook entry", async () => {
      const db = getDb(this.env);
      return await GuestbookService.findEntryById(
        { db, env: this.env },
        entryId,
      );
    });

    if (!entry) {
      console.log(
        JSON.stringify({
          message: "guestbook entry not found, skipping moderation",
          entryId,
        }),
      );
      return;
    }

    // Skip if entry is already processed or deleted
    if (entry.status !== "verifying") {
      console.log(
        JSON.stringify({
          message: "guestbook entry already processed, skipping moderation",
          entryId,
          status: entry.status,
        }),
      );
      return;
    }

    // Extract plain text (guestbook content is plain text, not JSON)
    const plainText = entry.content;

    if (!plainText || plainText.trim().length === 0) {
      // Empty entry, mark as pending for manual review
      await step.do("mark empty entry as pending", async () => {
        const db = getDb(this.env);
        await GuestbookService.updateEntryStatus(
          { db, env: this.env },
          entryId,
          "pending",
          m.guestbook_moderation_reason_empty_pending({}, { locale }),
        );
      });
      return;
    }

    // Step 2: Fetch thread context (if reply)
    const threadContext = await step.do("fetch thread context", async () => {
      const db = getDb(this.env);
      const rootEntry = entry.rootId
        ? await GuestbookService.findEntryById(
            { db, env: this.env },
            entry.rootId,
          )
        : null;

      return {
        rootEntryText: rootEntry ? rootEntry.content.trim() : "",
        replyToEntryText: rootEntry ? rootEntry.content.trim() : "",
      };
    });

    // Step 3: Call AI to moderate the content
    const moderationResult = await step.do(
      `moderate guestbook entry ${entryId}`,
      {
        retries: {
          limit: 3,
          delay: "5 seconds",
          backoff: "exponential",
        },
      },
      async () => {
        if (isNotInProduction(this.env)) {
          return {
            safe: true,
            reason: m.guestbook_moderation_reason_dev_approved({}, { locale }),
          };
        }
        try {
          return await AiService.moderateComment(
            { env: this.env },
            {
              comment: plainText,
              post: {
                title: "",
                summary: "",
                contentPreview: "",
              },
              thread: {
                isReply: Boolean(entry.rootId),
                rootComment: threadContext.rootEntryText,
                replyToComment: threadContext.replyToEntryText,
              },
            },
          );
        } catch (error) {
          console.error(
            JSON.stringify({
              message: "ai moderation failed for guestbook entry",
              entryId,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          return {
            safe: false,
            reason: m.guestbook_moderation_reason_ai_unavailable(
              {},
              { locale },
            ),
          };
        }
      },
    );

    // Step 4: Update entry status based on moderation result
    await step.do("update entry status", async () => {
      const db = getDb(this.env);

      if (moderationResult.safe) {
        await GuestbookService.updateEntryStatus(
          { db, env: this.env },
          entryId,
          "published",
          moderationResult.reason,
        );
      } else {
        await GuestbookService.updateEntryStatus(
          { db, env: this.env },
          entryId,
          "pending",
          moderationResult.reason,
        );
      }
    });

    // Step 4.5: Notify admin when entry is flagged for review
    if (!moderationResult.safe) {
      await step.do("notify admin pending entry", async () => {
        const db = getDb(this.env);
        const author = await GuestbookRepo.getEntryAuthorWithEmail(
          db,
          entry.id,
        );
        const { ADMIN_EMAIL, DOMAIN } = serverEnv(this.env);
        const entryPreview = plainText.slice(0, 100);
        await publishNotificationEvent(
          { db, env: this.env, executionCtx: this.ctx },
          {
            type: "guestbook.admin_pending_review",
            data: {
              to: ADMIN_EMAIL,
              entryPreview: `${entryPreview}${entryPreview.length >= 100 ? "..." : ""}`,
              submitterName: author?.name ?? entry.nickname ?? "匿名用户",
              reviewUrl: `https://${DOMAIN}/admin/guestbook`,
            },
          },
        );
      });
    }

    // Step 5: Send reply notification if entry was approved and is a reply
    if (moderationResult.safe && entry.rootId) {
      await step.do("send reply notification", async () => {
        const db = getDb(this.env);
        await sendGuestbookReplyNotification(
          { db, env: this.env, executionCtx: this.ctx },
          {
            entry: {
              id: entry.id,
              rootId: entry.rootId,
              replyToUserId: entry.replyToUserId,
              userId: entry.userId,
              nickname: entry.nickname,
              content: entry.content,
            },
          },
        );
      });
    }
  }
}
