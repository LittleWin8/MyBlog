import type { Locale } from "@/lib/i18n";
import { m } from "@/paraglide/messages";
import { EmailLayout } from "./EmailLayout";

interface AdminNotificationEmailProps {
  commentPreview: string;
  commentUrl: string;
  commenterName: string;
  locale: Locale;
  mode: "new" | "pending" | "guestbook-new" | "guestbook-pending";
  postTitle?: string;
}

export const AdminNotificationEmail = ({
  commentPreview,
  commentUrl,
  commenterName,
  locale,
  mode,
  postTitle,
}: AdminNotificationEmailProps) => {
  const isPending = mode === "pending" || mode === "guestbook-pending";
  const isGuestbook = mode === "guestbook-new" || mode === "guestbook-pending";

  const previewText = isGuestbook
    ? isPending
      ? m.email_guestbook_admin_pending_preview(
          { submitterName: commenterName },
          { locale },
        )
      : m.email_guestbook_admin_new_preview(
          { submitterName: commenterName },
          { locale },
        )
    : isPending
      ? m.email_comment_admin_pending_preview(
          { commenterName, postTitle: postTitle ?? "" },
          { locale },
        )
      : m.email_comment_admin_root_preview(
          { commenterName, postTitle: postTitle ?? "" },
          { locale },
        );

  const title = isGuestbook
    ? isPending
      ? m.email_guestbook_admin_pending_title({}, { locale })
      : m.email_guestbook_admin_new_title({}, { locale })
    : isPending
      ? m.email_comment_admin_pending_title({}, { locale })
      : m.email_comment_admin_root_title({}, { locale });

  const intro = isGuestbook
    ? isPending
      ? m.email_guestbook_admin_pending_intro(
          { submitterName: commenterName },
          { locale },
        )
      : m.email_guestbook_admin_new_intro(
          { submitterName: commenterName },
          { locale },
        )
    : isPending
      ? m.email_comment_admin_pending_intro(
          { commenterName, postTitle: postTitle ?? "" },
          { locale },
        )
      : m.email_comment_admin_root_intro(
          { commenterName, postTitle: postTitle ?? "" },
          { locale },
        );

  const actionLabel = isGuestbook
    ? isPending
      ? m.email_guestbook_admin_pending_action({}, { locale })
      : m.email_guestbook_admin_new_action({}, { locale })
    : isPending
      ? m.email_comment_admin_pending_action({}, { locale })
      : m.email_comment_admin_root_action({}, { locale });

  return (
    <EmailLayout locale={locale} previewText={previewText}>
      <h1
        style={{
          fontFamily: '"Playfair Display", "Georgia", serif',
          fontSize: "20px",
          fontWeight: "500",
          color: "#1a1a1a",
          marginBottom: "24px",
          lineHeight: "1.4",
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
        {intro}
      </p>
      <blockquote
        style={{
          borderLeft: "2px solid #e5e5e5",
          margin: "24px 0",
          paddingLeft: "16px",
          fontStyle: "italic",
          color: "#666",
          fontSize: "14px",
          lineHeight: "1.6",
        }}
      >
        {commentPreview}
      </blockquote>
      <div style={{ marginTop: "32px" }}>
        <a
          href={commentUrl}
          style={{
            backgroundColor: "#1a1a1a",
            color: "#ffffff",
            padding: "12px 24px",
            textDecoration: "none",
            fontSize: "13px",
            display: "inline-block",
            letterSpacing: "0.05em",
          }}
        >
          {actionLabel}
        </a>
      </div>
    </EmailLayout>
  );
};
