import * as GuestbookRepo from "@/features/guestbook/data/guestbook.data";
import { publishNotificationEvent } from "@/features/notification/service/notification.publisher";
import { serverEnv } from "@/lib/env/server.env";

interface SendGuestbookReplyNotificationParams {
  entry: {
    id: number;
    rootId: number | null;
    replyToUserId: string | null;
    userId: string | null;
    nickname: string | null;
    content: string;
  };
  skipNotifyUserId?: string;
}

export async function sendGuestbookReplyNotification(
  context: DbContext & { executionCtx: ExecutionContext },
  params: SendGuestbookReplyNotificationParams,
): Promise<void> {
  const { entry } = params;

  if (!entry.replyToUserId) return;

  // Get the user being replied to by their userId
  const replyToAuthor = await GuestbookRepo.getUserById(
    context.db,
    entry.replyToUserId,
  );

  if (!replyToAuthor || !replyToAuthor.email) {
    console.log(
      JSON.stringify({
        message:
          "guestbook reply notification skipped, author not found or no email",
        replyToUserId: entry.replyToUserId,
      }),
    );
    return;
  }

  // Don't notify if replying to own entry
  if (entry.userId && replyToAuthor.id === entry.userId) {
    console.log(
      JSON.stringify({
        message: "guestbook reply notification skipped, self-reply",
      }),
    );
    return;
  }

  // Don't notify if the moderator is the reply-to author
  if (params.skipNotifyUserId && replyToAuthor.id === params.skipNotifyUserId) {
    console.log(
      JSON.stringify({
        message:
          "guestbook reply notification skipped, moderator is reply-to author",
      }),
    );
    return;
  }

  const replierName = entry.nickname ?? (entry.userId ? "有人" : "匿名用户");
  const replyPreview = entry.content.slice(0, 100);
  const { DOMAIN } = serverEnv(context.env);

  // Build URL with entry anchor
  const rootId = entry.rootId ?? entry.id;
  const entryUrl = `https://${DOMAIN}/guestbook?highlightEntryId=${entry.id}&rootId=${rootId}#entry-${entry.id}`;

  try {
    await publishNotificationEvent(
      { db: context.db, env: context.env, executionCtx: context.executionCtx },
      {
        type:
          replyToAuthor.role === "admin"
            ? "guestbook.reply_to_admin_published"
            : "guestbook.reply_to_user_published",
        data: {
          to: replyToAuthor.email,
          replierName,
          replyPreview: `${replyPreview}${replyPreview.length >= 100 ? "..." : ""}`,
          entryUrl,
        },
      },
    );

    console.log(
      JSON.stringify({
        message: "guestbook reply notification queued",
        to: replyToAuthor.email,
        entryId: entry.id,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "guestbook reply notification queue failed",
        entryId: entry.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
