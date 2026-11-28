import { describe, expect, it } from "vitest";
import migration from "../../supabase/migrations/20261128000400_complete_notification_routes.sql?raw";
import { isAuthorizedNotificationRoute } from "./use-notifications";

const rows = [
  ...migration.matchAll(/^\s*\('([a-z_]+)', '([a-z_]+)', '([^']+)'\),?$/gm),
].map(([, event, role, route]) => ({ event, role, route }));

describe("database notification routes", () => {
  it("reads the route list from the migration", () => {
    expect(rows.length).toBeGreaterThan(50);
  });

  it.each([
    ["inc_deadline_approaching", "department_head"],
    ["credit_decision_recorded", "adviser"],
    ["term_override_toggled", "department_staff"],
    ["term_override_toggled", "dean"],
    ["encoding_deadline_approaching", "dean"],
  ])("covers %s for %s", (event, role) => {
    expect(rows.some((row) => row.event === event && row.role === role)).toBe(
      true,
    );
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
