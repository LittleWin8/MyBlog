import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import { featureConfigQuery } from "@/features/config/queries";
import { guestbookRootsQuery } from "@/features/guestbook/queries";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/guestbook")({
  component: GuestbookRoute,
  loader: async ({ context }) => {
    const feature =
      await context.queryClient.ensureQueryData(featureConfigQuery);
    if (feature.guestbookEnabled) {
      await context.queryClient.ensureQueryData(guestbookRootsQuery());
    }
  },
  head: () => ({
    meta: [
      {
        title: m.guestbook_title(),
      },
    ],
  }),
  pendingComponent: theme.GuestbookPageSkeleton,
});

function GuestbookRoute() {
  const { data: feature } = useSuspenseQuery(featureConfigQuery);

  if (!feature.guestbookEnabled) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground font-serif italic gap-4">
        <p className="text-lg">{m.feature_guestbook_disabled_title()}</p>
        <p className="text-sm">{m.feature_guestbook_disabled_desc()}</p>
      </div>
    );
  }

  return <GuestbookContent />;
}

function GuestbookContent() {
  const { data } = useSuspenseQuery(guestbookRootsQuery());
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id ?? null;
  return (
    <theme.GuestbookPage entries={data.items} currentUserId={currentUserId} />
  );
}
