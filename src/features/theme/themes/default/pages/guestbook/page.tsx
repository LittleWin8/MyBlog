import { useGuestbook } from "@/features/guestbook/hooks/use-guestbook";
import type { GuestbookPageProps } from "@/features/theme/contract/pages";
import { formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { GuestbookForm } from "./form";

export function GuestbookPage({ entries, currentUserId }: GuestbookPageProps) {
  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      <header className="py-12 md:py-20 space-y-6">
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
          {m.guestbook_title()}
        </h1>
        <p className="max-w-xl text-base md:text-lg font-light text-muted-foreground leading-relaxed">
          {m.guestbook_subtitle()}
        </p>
      </header>

      <GuestbookForm />

      <div className="mt-10 min-h-50">
        {entries.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-lg text-muted-foreground/50">
              {m.guestbook_empty_title()}
            </p>
            <p className="mt-2 text-sm text-muted-foreground/30 font-mono">
              {m.guestbook_empty_desc()}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {entries.map((entry) => (
              <GuestbookEntryItem
                key={entry.id}
                entry={entry}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GuestbookEntryItem({
  entry,
  currentUserId,
}: {
  entry: GuestbookPageProps["entries"][number];
  currentUserId?: string | null;
}) {
  const { deleteEntry, isDeleting } = useGuestbook();
  const displayName =
    entry.user?.name ?? entry.nickname ?? m.guestbook_anonymous();
  const avatar = entry.user?.image;
  const timeAgo = formatTimeAgo(entry.createdAt);
  const canDelete = currentUserId && entry.userId === currentUserId;

  return (
    <div className="flex gap-4 group">
      {/* Avatar */}
      <div className="shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
            {displayName.charAt(0)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {timeAgo}
          </span>
          {canDelete && (
            <button
              onClick={() => deleteEntry({ data: { id: entry.id } })}
              disabled={isDeleting}
              className="text-[10px] font-mono text-muted-foreground/50 hover:text-red-500 transition-colors ml-auto opacity-0 group-hover:opacity-100"
            >
              [{m.guestbook_delete_own()}]
            </button>
          )}
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
          {entry.content}
        </p>
        {entry.replyCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {m.guestbook_reply_count({ count: entry.replyCount })}
          </span>
        )}
      </div>
    </div>
  );
}
