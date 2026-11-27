import { describe, expect, it } from "vitest";
import migration from "../../supabase/migrations/20261128000200_notification_target_routes.sql?raw";
import { isAuthorizedNotificationRoute } from "./use-notifications";

const rows = [
  ...migration.matchAll(/^\s*\('([a-z_]+)', '([a-z_]+)', '([^']+)'\),?$/gm),
].map(([, event, role, route]) => ({ event, role, route }));

describe("database notification routes", () => {
  it("reads the route list from the migration", () => {
    expect(rows.length).toBeGreaterThan(50);
  });

  it.each(rows)("$event opens $route for $role", ({ role, route }) => {
    expect(
      isAuthorizedNotificationRoute(
        route.replace("{student}", "00000005-0000-4000-8000-000000000000"),
        role,
      ),
    ).toBe(true);
  });
});
