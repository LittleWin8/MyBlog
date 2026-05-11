import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useGuestbook } from "@/features/guestbook/hooks/use-guestbook";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";

export function GuestbookForm() {
  const { data: session } = authClient.useSession();
  const { createEntry, isCreating, createAnonymousEntry, isCreatingAnonymous } =
    useGuestbook();
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");

  const isLoggedIn = !!session;
  const isSubmitting = isCreating || isCreatingAnonymous;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    try {
      if (isLoggedIn) {
        await createEntry({ data: { content: content.trim() } });
      } else {
        await createAnonymousEntry({
          data: {
            content: content.trim(),
            nickname: nickname.trim() || undefined,
          },
        });
      }
      setContent("");
      setNickname("");
    } catch {
      // errors handled in hook
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fuwari-card-base p-5 md:p-6 fuwari-onload-animation space-y-4"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={m.guestbook_form_placeholder()}
        maxLength={1000}
        rows={3}
        className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--fuwari-primary)/50 focus:bg-transparent placeholder:fuwari-text-30 resize-none transition-all"
      />

      <div className="flex items-center justify-between gap-3">
        {!isLoggedIn && (
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={m.guestbook_form_nickname_placeholder()}
            maxLength={20}
            className="flex-1 max-w-[180px] px-4 py-2 rounded-xl text-sm border border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:ring-2 focus:ring-(--fuwari-primary)/50 focus:border-transparent transition-all"
          />
        )}

        <div className="flex items-center gap-3 ml-auto">
          {!isLoggedIn && (
            <Link
              to="/login"
              className="text-xs fuwari-text-50 hover:text-(--fuwari-primary) transition-colors whitespace-nowrap"
            >
              {m.guestbook_form_login()}
            </Link>
          )}
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-sm fuwari-btn-primary active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--fuwari-primary) disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSubmitting
              ? m.guestbook_form_submitting()
              : m.guestbook_form_submit()}
          </button>
        </div>
      </div>
    </form>
  );
}
