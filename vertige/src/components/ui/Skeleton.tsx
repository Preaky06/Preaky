import { cn } from "@/lib/utils";

/** Squelette de chargement avec brillance (shimmer). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton block", className)} />;
}

export function CardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement" className="panel flex flex-col gap-4 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </div>
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
