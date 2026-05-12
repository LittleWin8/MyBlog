import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { m } from "@/paraglide/messages";
import {
  adminDeleteGuestbookEntryFn,
  moderateGuestbookEntryFn,
} from "../api/guestbook.admin.api";
import {
  createAnonymousGuestbookEntryFn,
  createGuestbookEntryFn,
  deleteGuestbookEntryFn,
} from "../api/guestbook.public.api";
import { GUESTBOOK_KEYS } from "../queries";

export function useGuestbook() {
  const queryClient = useQueryClient();

  const createEntryMutation = useMutation({
    mutationFn: async (input: Parameters<typeof createGuestbookEntryFn>[0]) => {
      return await createGuestbookEntryFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        const reason = result.error.reason;
        switch (reason) {
          case "ROOT_ENTRY_NOT_FOUND":
            toast.error(m.guestbook_root_not_found());
            return;
          case "INVALID_ROOT_ID":
            toast.error(m.guestbook_invalid_root());
            return;
          case "NICKNAME_REQUIRED":
            toast.error(m.guestbook_nickname_required());
            return;
          case "FEATURE_DISABLED":
            toast.error(m.feature_guestbook_disabled_title());
            return;
          default:
            reason satisfies never;
            toast.error(m.guestbook_create_failed());
            return;
        }
      }

      queryClient.invalidateQueries({
        queryKey: GUESTBOOK_KEYS.roots,
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: GUESTBOOK_KEYS.repliesLists,
        exact: false,
      });

      // Show appropriate success message based on status
      if (result.data?.status === "verifying") {
        toast.success(m.guestbook_create_pending_success());
      } else {
        toast.success(m.guestbook_create_success());
      }
    },
    onError: () => {
      toast.error(m.guestbook_create_failed());
    },
  });

  const createAnonymousEntryMutation = useMutation({
    mutationFn: async (
      input: Parameters<typeof createAnonymousGuestbookEntryFn>[0],
    ) => {
      return await createAnonymousGuestbookEntryFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        const reason = result.error.reason;
        switch (reason) {
          case "ROOT_ENTRY_NOT_FOUND":
            toast.error(m.guestbook_root_not_found());
            return;
          case "INVALID_ROOT_ID":
            toast.error(m.guestbook_invalid_root());
            return;
          case "NICKNAME_REQUIRED":
            toast.error(m.guestbook_nickname_required());
            return;
          case "FEATURE_DISABLED":
            toast.error(m.feature_guestbook_disabled_title());
            return;
          default:
            reason satisfies never;
            toast.error(m.guestbook_create_failed());
            return;
        }
      }

      queryClient.invalidateQueries({
        queryKey: GUESTBOOK_KEYS.roots,
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: GUESTBOOK_KEYS.repliesLists,
        exact: false,
      });

      // Anonymous entries always go through moderation
      toast.success(m.guestbook_create_pending_success());
    },
    onError: () => {
      toast.error(m.guestbook_create_failed());
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (input: Parameters<typeof deleteGuestbookEntryFn>[0]) => {
      return await deleteGuestbookEntryFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        const reason = result.error.reason;
        switch (reason) {
          case "ENTRY_NOT_FOUND":
            toast.error(m.guestbook_delete_failed());
            return;
          case "PERMISSION_DENIED":
            toast.error(m.guestbook_delete_no_permission());
            return;
          default:
            reason satisfies never;
            toast.error(m.guestbook_delete_failed());
            return;
        }
      }

      queryClient.invalidateQueries({
        queryKey: GUESTBOOK_KEYS.roots,
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: GUESTBOOK_KEYS.repliesLists,
        exact: false,
      });
      toast.success(m.guestbook_delete_success());
    },
    onError: () => {
      toast.error(m.guestbook_delete_failed());
    },
  });

  return {
    createEntry: createEntryMutation.mutateAsync,
    isCreating: createEntryMutation.isPending,
    createAnonymousEntry: createAnonymousEntryMutation.mutateAsync,
    isCreatingAnonymous: createAnonymousEntryMutation.isPending,
    deleteEntry: deleteEntryMutation.mutateAsync,
    isDeleting: deleteEntryMutation.isPending,
  };
}

export function useAdminGuestbook() {
  const queryClient = useQueryClient();

  const moderateMutation = useMutation({
    mutationFn: async (
      input: Parameters<typeof moderateGuestbookEntryFn>[0],
    ) => {
      return await moderateGuestbookEntryFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.guestbook_moderation_failed());
        return;
      }

      queryClient.invalidateQueries({
        queryKey: GUESTBOOK_KEYS.all,
        exact: false,
      });
      toast.success(m.guestbook_moderation_success());
    },
  });

  const adminDeleteMutation = useMutation({
    mutationFn: async (
      input: Parameters<typeof adminDeleteGuestbookEntryFn>[0],
    ) => {
      return await adminDeleteGuestbookEntryFn(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: GUESTBOOK_KEYS.all,
        exact: false,
      });
      toast.success(m.guestbook_delete_success());
    },
    onError: () => {
      toast.error(m.guestbook_delete_failed());
    },
  });

  return {
    moderate: moderateMutation.mutate,
    moderateAsync: moderateMutation.mutateAsync,
    isModerating: moderateMutation.isPending,
    adminDelete: adminDeleteMutation.mutate,
    adminDeleteAsync: adminDeleteMutation.mutateAsync,
    isAdminDeleting: adminDeleteMutation.isPending,
  };
}
