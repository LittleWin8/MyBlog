import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Loader2, MessageSquareOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { GuestbookModerationActions } from "@/features/guestbook/components/admin/guestbook-moderation-actions";
import { useAdminGuestbook } from "@/features/guestbook/hooks/use-guestbook";
import {
  adminGuestbookQuery,
  GUESTBOOK_KEYS,
} from "@/features/guestbook/queries";
import { formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const PAGE_SIZE = 20;

const searchSchema = z.object({
  status: z
    .enum(["pending", "published", "deleted", "ALL"])
    .optional()
    .default("pending")
    .catch("pending"),
  page: z.number().optional().default(1).catch(1),
});

export const Route = createFileRoute("/admin/guestbook/")({
  ssr: false,
  validateSearch: searchSchema,
  component: GuestbookAdminPage,
  loader: () => ({
    title: m.guestbook_admin_title(),
  }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});

function GuestbookAdminPage() {
  const { status, page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const offset = (page - 1) * PAGE_SIZE;

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery(adminGuestbookQuery({ status, offset, limit: PAGE_SIZE }));

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { moderateAsync, adminDeleteAsync } = useAdminGuestbook();
  const queryClient = useQueryClient();

  const handleSelectAll = () => {
    if (!response) return;
    if (selectedIds.size === response.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(response.items.map((item) => item.id)));
    }
  };

  const handleSelectOne = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBatchTrash = async () => {
    if (selectedIds.size === 0) return;
    const toastId = toast.loading(
      m.guestbook_batch_trash_loading({ count: selectedIds.size }),
    );
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          moderateAsync({ data: { id, status: "deleted" } }),
        ),
      );
      toast.success(m.guestbook_batch_trash_success(), { id: toastId });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: GUESTBOOK_KEYS.all });
    } catch {
      toast.error(m.guestbook_batch_partial_fail(), { id: toastId });
    }
  };

  const handleBatchRestore = async () => {
    if (selectedIds.size === 0) return;
    const toastId = toast.loading(
      m.guestbook_batch_restore_loading({ count: selectedIds.size }),
    );
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          moderateAsync({ data: { id, status: "published" } }),
        ),
      );
      toast.success(m.guestbook_batch_restore_success(), { id: toastId });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: GUESTBOOK_KEYS.all });
    } catch {
      toast.error(m.guestbook_batch_partial_fail(), { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    await adminDeleteAsync({ data: { id: deleteId } });
    setDeleteId(null);
  };

  const handleStatusChange = (
    newStatus: "pending" | "published" | "deleted" | "ALL",
  ) => {
    navigate({ search: { status: newStatus, page: 1 } });
  };

  const handlePageChange = (newPage: number) => {
    navigate({ search: (prev) => ({ ...prev, page: newPage }) });
  };

  const tabs: Array<{
    key: "pending" | "published" | "deleted" | "ALL";
    label: string;
  }> = [
    { key: "pending", label: m.guestbook_tab_pending() },
    { key: "published", label: m.guestbook_tab_published() },
    { key: "deleted", label: m.guestbook_tab_deleted() },
    { key: "ALL", label: m.guestbook_tab_all() },
  ];

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground font-serif italic gap-4 border-t border-border">
        <AlertTriangle size={40} strokeWidth={1} className="opacity-30" />
        <p>{m.guestbook_load_fail()}</p>
      </div>
    );
  }

  const totalPages = response ? Math.ceil(response.total / PAGE_SIZE) : 0;
  const allSelected = response
    ? response.items.length > 0 && selectedIds.size === response.items.length
    : false;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
            {m.guestbook_admin_title()}
          </h1>
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
            {m.guestbook_admin_tag()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleStatusChange(tab.key)}
            className={`relative text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap font-mono ${
              status === tab.key
                ? "text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {status === tab.key ? `[ ${tab.label} ]` : tab.label}
          </button>
        ))}
      </nav>

      {/* Entry List */}
      <div className="min-h-100">
        {!response || response.items.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground font-serif italic gap-4 border-t border-border">
            <MessageSquareOff
              size={40}
              strokeWidth={1}
              className="opacity-20"
            />
            <p>{m.guestbook_admin_empty()}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Batch Actions Toolbar */}
            {selectedIds.size > 0 && (
              <div className="sticky top-4 z-40 flex items-center justify-between p-4 bg-background border border-border/30 shadow-none animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em]">
                    {m.guestbook_batch_selected({ count: selectedIds.size })}
                  </span>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    [ {m.guestbook_batch_cancel()} ]
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {status !== "deleted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBatchTrash}
                      className="h-8 px-4 rounded-none border-border/50 hover:bg-red-500/10 hover:text-red-500 transition-all font-mono text-[10px] uppercase tracking-widest"
                    >
                      [ {m.guestbook_batch_trash()} ]
                    </Button>
                  )}
                  {status !== "published" && (
                    <Button
                      size="sm"
                      onClick={handleBatchRestore}
                      className="h-8 px-4 rounded-none bg-foreground text-background hover:bg-foreground/90 transition-all font-mono text-[10px] uppercase tracking-widest"
                    >
                      [ {m.guestbook_batch_restore()} ]
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Table Header (Desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b border-border/30 items-center bg-muted/5">
              <div className="col-span-1 flex justify-center">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className="rounded-none border-border/50 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
                />
              </div>
              <div className="col-span-2 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                {m.guestbook_admin_col_author()}
              </div>
              <div className="col-span-5 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                {m.guestbook_admin_col_content()}
              </div>
              <div className="col-span-1 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                {m.guestbook_admin_col_replies()}
              </div>
              <div className="col-span-1 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                {m.guestbook_admin_col_status()}
              </div>
              <div className="col-span-2 text-right text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                {m.guestbook_admin_col_actions()}
              </div>
            </div>

            {/* Entries */}
            <div className="divide-y divide-border/30">
              {response.items.map((entry) => (
                <div
                  key={entry.id}
                  className={`
                    group transition-all duration-500
                    ${selectedIds.has(entry.id) ? "bg-muted/30" : "hover:bg-muted/10"}
                  `}
                >
                  {/* Desktop Item */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-6 items-start hover:bg-accent/5 transition-colors">
                    <div className="col-span-1 flex justify-center pt-1">
                      <Checkbox
                        checked={selectedIds.has(entry.id)}
                        onCheckedChange={() => handleSelectOne(entry.id)}
                        className="rounded-none border-border/50 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
                      />
                    </div>

                    {/* Author */}
                    <div className="col-span-2 flex items-center gap-3 min-w-0">
                      {entry.user?.image ? (
                        <img
                          src={entry.user.image}
                          alt={entry.user.name ?? ""}
                          className="w-8 h-8 rounded-none bg-muted/20 flex items-center justify-center border border-border/30 shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-none bg-muted/20 flex items-center justify-center border border-border/30 shrink-0">
                          <span className="text-[10px] font-mono">
                            {(entry.user?.name ?? entry.nickname ?? "?").charAt(
                              0,
                            )}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-xs font-serif font-medium truncate">
                          {entry.user?.name ??
                            entry.nickname ??
                            m.guestbook_anonymous()}
                        </div>
                        <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                          {formatTimeAgo(entry.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="col-span-5">
                      <p className="text-sm font-serif leading-relaxed text-foreground/80 tracking-wide line-clamp-3 whitespace-pre-wrap break-words">
                        {entry.content}
                      </p>
                    </div>

                    {/* Reply Count */}
                    <div className="col-span-1 text-xs font-mono text-muted-foreground pt-1">
                      {entry.replyCount > 0 ? entry.replyCount : "-"}
                    </div>

                    {/* Status */}
                    <div className="col-span-1 pt-1">
                      <StatusBadge status={entry.status} />
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-end">
                      <GuestbookModerationActions
                        entryId={entry.id}
                        status={entry.status}
                      />
                    </div>
                  </div>

                  {/* Mobile Item */}
                  <div className="md:hidden p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedIds.has(entry.id)}
                          onCheckedChange={() => handleSelectOne(entry.id)}
                          className="rounded-none border-border"
                        />
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-none bg-muted flex items-center justify-center border border-border shrink-0">
                            {entry.user?.image ? (
                              <img
                                src={entry.user.image}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-mono">
                                {(
                                  entry.user?.name ??
                                  entry.nickname ??
                                  "?"
                                ).charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold font-serif tracking-tight">
                              {entry.user?.name ??
                                entry.nickname ??
                                m.guestbook_anonymous()}
                            </div>
                            <div className="text-[9px] font-mono text-muted-foreground uppercase">
                              {formatTimeAgo(entry.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={entry.status} />
                    </div>

                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {entry.content}
                    </p>

                    {entry.replyCount > 0 && (
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {m.guestbook_admin_replies({ count: entry.replyCount })}
                      </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-border/30">
                      <GuestbookModerationActions
                        entryId={entry.id}
                        status={entry.status}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {response && response.items.length > 0 && (
        <div className="pt-12 px-2 border-t border-border/30">
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={response.total}
            itemsPerPage={PAGE_SIZE}
            currentPageItemCount={response.items.length}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={m.guestbook_admin_delete_title()}
        message={m.guestbook_admin_delete_confirm()}
        confirmLabel={m.guestbook_admin_delete_confirm_label()}
        isDanger
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    published: m.guestbook_status_published(),
    verifying: m.guestbook_status_verifying(),
    pending: m.guestbook_status_pending(),
    deleted: m.guestbook_status_deleted(),
  };

  const styles: Record<string, string> = {
    published: "text-foreground",
    verifying: "text-blue-500",
    pending: "text-yellow-500",
    deleted: "text-muted-foreground",
  };

  return (
    <div
      className={`font-mono text-[9px] uppercase tracking-widest ${styles[status] || ""}`}
    >
      [{labels[status] || status}]
    </div>
  );
}
