import { useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  isAuthorizedNotificationRoute,
  useNotifications,
} from "@/hooks/use-notifications";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { Button } from "@/components/ui/button";
import { AlertIcon, FlagIcon, UploadIcon, UserIcon } from "@/components/icons";
import type { ApiSchema } from "@/lib/api";

const ICONS: Record<ApiSchema<"NotificationKind">, typeof FlagIcon> = {
  flag: FlagIcon,
  import: UploadIcon,
  alert: AlertIcon,
  person: UserIcon,
  note: AlertIcon,
  grade: FlagIcon,
  transfer: UserIcon,
  report: AlertIcon,
};

export default function NotificationsPage() {
  const { user, roles, activeRole } = useAuth();
  const role = activeRole ?? roles[0] ?? user?.primaryRole ?? null;
  const {
    items,
    loading,
    error,
    markAllRead,
    markRead,
    markingRead,
    markError,
    capped,
  } = useNotifications(user?.id, !user, role, "/notifications");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const unreadFilter = useRef<HTMLButtonElement>(null);
  const unreadCount = items.filter((item) => !item.is_read).length;
  const visibleItems = unreadOnly
    ? items.filter((item) => !item.is_read)
    : items;

  return (
    <section aria-label="Notifications" className="min-w-0 max-w-full">
      <PageHeading
        title="Notifications"
        subtitle={
          loading
            ? "Loading your notifications."
            : error
              ? "Notifications are unavailable."
              : capped
                ? `Showing the latest ${items.length} notifications; ${unreadCount} unread in this list.`
                : `${unreadCount} unread of ${items.length} notifications.`
        }
        actions={
          <Button
            variant="outline"
            disabled={loading || unreadCount === 0 || markingRead}
            onClick={() => void markAllRead().catch(() => undefined)}
          >
            Mark all as read
          </Button>
        }
      />
      <div
        className="mb-4 inline-flex gap-1 rounded-lg border border-border bg-card p-1"
        role="group"
        aria-label="Filter notifications"
      >
        <Button
          size="sm"
          variant={!unreadOnly ? "default" : "ghost"}
          aria-pressed={!unreadOnly}
          onClick={() => setUnreadOnly(false)}
        >
          All
        </Button>
        <Button
          ref={unreadFilter}
          size="sm"
          variant={unreadOnly ? "default" : "ghost"}
          aria-pressed={unreadOnly}
          onClick={() => setUnreadOnly(true)}
        >
          Unread ({unreadCount})
        </Button>
      </div>
      {loading ? (
        <p role="status">Loading notifications…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <Panel
          title={unreadOnly ? "Unread notifications" : "All notifications"}
          flush
        >
          {visibleItems.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              You are all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {visibleItems.map((item) => {
                const Icon = ICONS[item.kind] ?? AlertIcon;
                const destination = isAuthorizedNotificationRoute(
                  item.target_route,
                  role,
                )
                  ? item.target_route
                  : undefined;
                const createdAt = new Date(item.created_at);
                const time = Number.isNaN(createdAt.getTime())
                  ? "Date unavailable"
                  : new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(createdAt);
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start gap-3 px-5 py-4"
                  >
                    <span
                      aria-hidden
                      className={`mt-2 size-2 shrink-0 rounded-full ${!item.is_read ? "bg-gold" : "bg-transparent"}`}
                    />
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-neutral-bg text-status-neutral">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong
                        className={`block text-sm ${!item.is_read ? "font-semibold" : "font-medium"}`}
                      >
                        {item.title}
                      </strong>
                      {!item.is_read && <span className="sr-only">Unread</span>}
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {item.body}
                      </span>
                      {destination ? (
                        <Link
                          to={destination}
                          className="mt-1 block text-sm font-semibold text-primary"
                        >
                          Open
                        </Link>
                      ) : (
                        <span className="mt-1 block text-sm text-muted-foreground">
                          No available destination
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {time}
                    </span>
                    {!item.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={markingRead}
                        onClick={() => {
                          if (unreadOnly) unreadFilter.current?.focus();
                          void markRead(item.id).catch(() => undefined);
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}
      {markError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {markError}
        </p>
      )}
    </section>
  );
}
