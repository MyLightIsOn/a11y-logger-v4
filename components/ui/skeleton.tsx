import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-live="polite"
      className={cn(
        "bg-gray-300 dark:bg-accent animate-pulse rounded-md",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
