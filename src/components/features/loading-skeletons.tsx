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
  bare,
  children,
}: {
  label: string;
  className?: string;
  /** Skip the status wrapper (Skullet already announces its own label). */
  bare?: boolean;
  children: React.ReactNode;
}) {
  if (bare) {
    return (
      <div className={className} aria-hidden="true">
        {children}
      </div>
    );
  }
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
  bare,
  className,
}: {
  lines?: number;
  label?: string;
  className?: string;
  bare?: boolean;
}) {
  return (
    <Status label={label} className={className} bare={bare}>
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
  bare,
  className,
}: {
  rows?: number;
  columns?: number;
  label?: string;
  className?: string;
  bare?: boolean;
}) {
  return (
    <Status label={label} className={className} bare={bare}>
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
  bare,
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
  bare?: boolean;
}) {
  return (
    <Status label={label} className={className} bare={bare}>
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
  bare,
  className,
}: {
  label?: string;
  className?: string;
  bare?: boolean;
}) {
  return (
    <Status label={label} className={cn("p-6", className)} bare={bare}>
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

/** True when Skullet already remembers a measured layout for this id. */
function hasRememberedShape(id: string | undefined): boolean {
  if (!id || typeof localStorage === "undefined") return false;
  try {
    const stored = JSON.parse(localStorage.getItem("skullet:shapes") ?? "null");
    return Boolean(stored?.shapes?.[id]);
  } catch {
    return false;
  }
}

/**
 * Skullet <Skeleton> keyed by the signed-in account. Skullet keeps the content
 * it last showed under an id so reloads fit exactly; keying by account makes a
 * switch remount it, so one account's records never linger in the DOM for the
 * next.
 *
 * Until a layout has been remembered (first visit on a device) the measured
 * skeleton would be empty boxes, so `fallback` bars are shown instead.
 */
export function AccountSkeleton<T>({
  fallback,
  ...props
}: SkeletonProps<T> & { fallback?: React.ReactNode }) {
  let accountId = "anonymous";
  try {
    // useAuth only throws when no provider exists, which is stable per tree.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    accountId = useAuth().user?.id ?? accountId;
  } catch {
    // Rendered outside an AuthProvider (public pages, isolated tests).
  }
  const useFallback = !props.skeleton && !hasRememberedShape(props.id);
  const bars =
    fallback ??
    ("data" in props ? (
      <PageSkeleton bare />
    ) : (
      <TableSkeleton rows={6} columns={4} bare />
    ));
  const placeholder = useFallback ? (
    <>
      {props.label ? (
        <span {...{ "skullet-status": "" }}>{props.label}</span>
      ) : null}
      {bars}
    </>
  ) : (
    props.skeleton
  );
  return (
    <Skeleton
      key={accountId}
      {...(props as SkeletonProps<T>)}
      skeleton={placeholder}
    />
  );
}
