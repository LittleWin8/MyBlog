import type { GuestbookWithReplyCount } from "@/features/guestbook/guestbook.schema";

export interface GuestbookPageProps {
  entries: Array<GuestbookWithReplyCount>;
  currentUserId?: string | null;
}
