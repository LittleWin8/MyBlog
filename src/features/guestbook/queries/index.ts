import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { adminGetGuestbookEntriesFn } from "../api/guestbook.admin.api";
import {
  getGuestbookEntriesFn,
  getGuestbookRepliesFn,
  getMyGuestbookEntriesFn,
} from "../api/guestbook.public.api";

export const GUESTBOOK_KEYS = {
  all: ["guestbook"] as const,
  roots: ["guestbook", "roots"] as const,
  replies: (rootId: number) => ["guestbook", "replies", rootId] as const,
  repliesLists: ["guestbook", "replies"] as const,
  admin: ["guestbook", "admin"] as const,
  my: ["guestbook", "my"] as const,
};

export function guestbookRootsQuery() {
  return queryOptions({
    queryKey: GUESTBOOK_KEYS.roots,
    queryFn: () => getGuestbookEntriesFn({ data: {} }),
  });
}

export function guestbookRootsInfiniteQuery() {
  return infiniteQueryOptions({
    queryKey: [...GUESTBOOK_KEYS.roots, "infinite"],
    queryFn: ({ pageParam = 0 }) =>
      getGuestbookEntriesFn({
        data: { offset: pageParam, limit: 20 },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce(
        (sum, page) => sum + page.items.length,
        0,
      );
      return totalLoaded < lastPage.total ? totalLoaded : undefined;
    },
  });
}

export function guestbookRepliesInfiniteQuery(rootId: number) {
  return infiniteQueryOptions({
    queryKey: GUESTBOOK_KEYS.replies(rootId),
    queryFn: ({ pageParam = 0 }) =>
      getGuestbookRepliesFn({
        data: { rootId, offset: pageParam, limit: 20 },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce(
        (sum, page) => sum + page.items.length,
        0,
      );
      return totalLoaded < lastPage.total ? totalLoaded : undefined;
    },
  });
}

export function adminGuestbookQuery(options: {
  status?: string;
  offset?: number;
  limit?: number;
}) {
  return queryOptions({
    queryKey: [...GUESTBOOK_KEYS.admin, options] as const,
    queryFn: () => adminGetGuestbookEntriesFn({ data: options }),
  });
}

export function myGuestbookEntriesQuery() {
  return queryOptions({
    queryKey: GUESTBOOK_KEYS.my,
    queryFn: () => getMyGuestbookEntriesFn({ data: {} }),
  });
}
