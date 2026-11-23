import { Skeleton, SkeletonBox, type SkeletonProps } from "skullet/react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/**
 * Static loading placeholders built on skullet's SkeletonBox, so every page
 * shares one look and animation (configured by SkulletProvider in App).
 * Each renders a polite status with screen-reader text in place of the bars.
 */

function Status({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** A stack of text-line bars. */
export function LinesSkeleton({
  lines = 3,
  label = "Loading…",
  className,
}: {
  lines?: number;
  label?: string;
  className?: string;
}) {
  return (
    <Status label={label} className={className}>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonBox
            key={i}
            height={14}
            width={i === lines - 1 ? "60%" : "100%"}
          />
        ))}
      </div>
    </Status>
  );
}

/** Table-shaped placeholder: a header bar and `rows` rows of `columns` cells. */
export function TableSkeleton({
  rows = 6,
  columns = 4,
  label = "Loading…",
  className,
}: {
  rows?: number;
  columns?: number;
  label?: string;
  className?: string;
}) {
  return (
    <Status label={label} className={className}>
      <div className="flex flex-col gap-3">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, c) => (
            <SkeletonBox key={c} height={12} width="55%" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div
            key={r}
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }, (_, c) => (
              <SkeletonBox
                key={c}
                height={16}
                width={c === 0 ? "80%" : "65%"}
              />
            ))}
          </div>
        ))}
      </div>
    </Status>
  );
}

/** Card-grid placeholder for dashboards and stat tiles. */
export function CardsSkeleton({
  count = 4,
  label = "Loading…",
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <Status label={label} className={className}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-md border border-border p-4"
          >
            <SkeletonBox height={12} width="50%" />
            <SkeletonBox height={28} width="40%" />
            <SkeletonBox height={12} width="70%" />
          </div>
        ))}
      </div>
    </Status>
  );
}

/** Whole-page placeholder: heading, a row of tiles and a table. */
export function PageSkeleton({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Status label={label} className={cn("p-6", className)}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <SkeletonBox height={28} width="30%" />
          <SkeletonBox height={14} width="50%" />
        </div>
        <CardsSkeleton count={3} label="" />
        <TableSkeleton rows={5} columns={4} label="" />
      </div>
    </Status>
  );
}

/**
 * Skullet <Skeleton> keyed by the signed-in account. Skullet keeps the content
 * it last showed under an id so reloads fit exactly; keying by account makes a
 * switch remount it, so one account's records never linger in the DOM for the
 * next.
 */
export function AccountSkeleton<T>(props: SkeletonProps<T>) {
  let accountId = "anonymous";
  try {
    // useAuth only throws when no provider exists, which is stable per tree.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    accountId = useAuth().user?.id ?? accountId;
  } catch {
    // Rendered outside an AuthProvider (public pages, isolated tests).
  }
  return <Skeleton key={accountId} {...props} />;
}
