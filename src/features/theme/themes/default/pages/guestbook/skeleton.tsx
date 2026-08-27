import { Skeleton } from "@/components/ui/skeleton";

export function GuestbookPageSkeleton() {
  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      <header className="py-12 md:py-20 space-y-6">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-6 w-64" />
      </header>

      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
