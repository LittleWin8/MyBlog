import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useGuestbook } from "@/features/guestbook/hooks/use-guestbook";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";

export function GuestbookForm() {
  const { data: session } = authClient.useSession();
  const { createEntry, isCreating, createAnonymousEntry, isCreatingAnonymous } =
    useGuestbook();
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const isLoggedIn = !!session;
  const isSubmitting = isCreating || isCreatingAnonymous;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setShowSuccess(false);

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
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      // errors handled in hook
    }
  }

  return (
    <div className="space-y-3">
      {showSuccess && (
        <div className="text-xs font-mono text-muted-foreground border border-border/30 bg-muted/10 px-4 py-3 animate-in fade-in duration-300">
          {isLoggedIn
            ? m.guestbook_create_success()
            : m.guestbook_create_pending_success()}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="group/editor border border-border/10 rounded-sm bg-muted/5 transition-colors duration-300 hover:border-border/30 focus-within:border-border/50 focus-within:bg-background overflow-hidden">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={m.guestbook_form_placeholder()}
            maxLength={1000}
            rows={3}
            className="w-full bg-transparent min-h-[80px] px-4 py-3 text-sm focus:outline-none placeholder:text-muted-foreground/30 resize-none"
          />
          <div className="flex items-center justify-between px-4 pb-2 pt-1 border-t border-border/10">
            {!isLoggedIn && (
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={m.guestbook_form_nickname_placeholder()}
                maxLength={20}
                className="max-w-[160px] h-7 text-xs bg-transparent border-0 border-b border-border/30 rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none"
              />
            )}
            <div className={isLoggedIn ? "ml-auto" : ""}>
              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <span>
                  {isSubmitting
                    ? m.guestbook_form_submitting()
                    : m.guestbook_form_submit()}
                </span>
                {isSubmitting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
              </button>
            </div>
          </div>
        </div>

        {!isLoggedIn && (
          <p className="text-xs text-muted-foreground/50 font-mono">
            {m.guestbook_form_login_hint()}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {m.guestbook_form_login()}
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
