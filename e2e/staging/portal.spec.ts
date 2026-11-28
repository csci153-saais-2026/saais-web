import { expect, test, type Page } from "@playwright/test";

const portals = {
  student: ["/student/profile", "Your student profile."],
  adviser: ["/adviser/advisees", "Advisees"],
  department_head: [
    "/department-head/curriculum-transfers",
    "Curriculum transfers",
  ],
  department_staff: ["/department-staff/students", "Students"],
  dean: ["/dean/reports", "Faculty reports"],
  admin: ["/admin/accounts", "Accounts and roles"],
} as const;

type Role = keyof typeof portals;
type Account = { email: string; password: string };

function requiredOrigin(name: string): string {
  let url: URL;
  try {
    url = new URL(process.env[name] ?? "");
  } catch {
    throw new Error(`${name} must contain an HTTPS origin.`);
  }
  if (url.protocol !== "https:" || url.href !== `${url.origin}/`) {
    throw new Error(`${name} must contain an HTTPS origin.`);
  }
  return url.origin;
}

function qaAccounts(): Record<Role, Account> {
  let value: unknown;
  try {
    value = JSON.parse(process.env.SAAIS_STAGING_ACCOUNTS ?? "");
  } catch {
    throw new Error("Configure the staging QA account secret as JSON.");
  }
  const records = value as Partial<Record<Role, Partial<Account>>> | null;
  const accounts = {} as Record<Role, Account>;
  const emails = new Set<string>();
  for (const role of Object.keys(portals) as Role[]) {
    const account = records?.[role];
    if (
      typeof account?.email !== "string" ||
      !/^[^\s@]+@vsu\.edu\.ph$/i.test(account.email) ||
      typeof account.password !== "string" ||
      !account.password ||
      emails.has(account.email.toLowerCase())
    ) {
      throw new Error(
        `Configure a distinct institutional QA account for ${role}.`,
      );
    }
    accounts[role] = { email: account.email, password: account.password };
    emails.add(account.email.toLowerCase());
  }
  return accounts;
}

async function openLogin(page: Page) {
  const origin = requiredOrigin("SAAIS_STAGING_URL");
  const response = await page.goto(new URL("/login", origin).href);
  expect(response?.ok(), "The staging login page loads").toBe(true);
  expect(new URL(page.url()).origin === origin).toBe(true);
  const revision = process.env.SAAIS_STAGING_EXPECTED_SHA;
  if (revision) {
    await expect(page.locator('meta[name="saais-revision"]')).toHaveAttribute(
      "content",
      revision,
    );
  }
  const form = page.locator("form").filter({
    has: page.getByRole("button", { name: "Sign in", exact: true }),
  });
  await expect(form).toBeVisible();
  return form;
}

test("the sign-in form fits a narrow screen and supports keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const form = await openLogin(page);
  const email = form.getByLabel("Institutional email");
  const password = form.getByLabel("Password", { exact: true });
  await email.focus();
  await expect(email).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    form.getByRole("checkbox", { name: "Keep me signed in" }),
  ).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(321);
});

for (const role of Object.keys(portals) as Role[]) {
  const [path, heading] = portals[role];
  test(`${role} signs in and reloads the portal through the live gateway`, async ({
    page,
  }) => {
    const account = qaAccounts()[role];
    const apiOrigin = requiredOrigin("SAAIS_STAGING_SUPABASE_URL");
    await page.route("**/auth/v1/token**", (route) =>
      new URL(route.request().url()).origin === apiOrigin
        ? route.continue()
        : route.abort("blockedbyclient"),
    );
    const form = await openLogin(page);
    await form.getByLabel("Institutional email").fill(account.email);
    await form.getByLabel("Password", { exact: true }).fill(account.password);

    const [login] = await Promise.all([
      page.waitForResponse(
        (response) => {
          const url = new URL(response.url());
          return (
            url.origin === apiOrigin &&
            url.pathname === "/auth/v1/token" &&
            response.request().method() === "POST"
          );
        },
        { timeout: 15_000 },
      ),
      form.getByRole("button", { name: "Sign in", exact: true }).click(),
    ]);
    expect(login.ok(), `Supabase accepted the ${role} session`).toBe(true);
    await expect(page).toHaveURL((url) => url.pathname !== "/login");

    const gatewayRead = () =>
      page.waitForResponse(
        async (response) => {
          const url = new URL(response.url());
          const request = response.request();
          return (
            url.origin === apiOrigin &&
            url.pathname.startsWith("/functions/v1/data-api/") &&
            request.method() === "GET" &&
            response.ok() &&
            (await request.headerValue("accept-profile")) === "saais_api" &&
            Boolean(await request.headerValue("authorization"))
          );
        },
        { timeout: 15_000 },
      );
    await Promise.all([gatewayRead(), page.goto(path)]);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }).first(),
    ).toBeVisible();
    const [, reload] = await Promise.all([gatewayRead(), page.reload()]);
    expect(reload?.ok(), "The deployed host serves the role deep link").toBe(
      true,
    );
    await expect(
      page.getByRole("heading", { name: heading, exact: true }).first(),
    ).toBeVisible();

    if (role === "student") {
      const session = (await login.json()) as {
        access_token?: string;
        user?: { id?: string };
      };
      const studentId = session.user?.id;
      const key = await login.request().headerValue("apikey");
      if (!session.access_token || !studentId || !key) {
        throw new Error(
          "The student QA sign-in did not provide a Supabase session.",
        );
      }
      const checklistUrl = new URL(
        `/functions/v1/students/${encodeURIComponent(studentId)}/checklist`,
        apiOrigin,
      );
      const pages = await Promise.all(
        [0, 1].map((offset) =>
          page.request.get(checklistUrl.href, {
            params: { limit: "1", offset: String(offset) },
            headers: {
              apikey: key,
              Authorization: `Bearer ${session.access_token}`,
            },
            maxRedirects: 0,
          }),
        ),
      );
      const slots = await Promise.all(
        pages.map(async (response) => {
          expect(response.ok(), "The seeded student checklist page loads").toBe(
            true,
          );
          const rows = (await response.json()) as {
            curriculum_term_course_id?: string;
          }[];
          expect(
            rows.length,
            "The fixture has two or more checklist slots",
          ).toBe(1);
          const slotId = rows[0]?.curriculum_term_course_id;
          expect(Boolean(slotId), "The checklist row includes a slot ID").toBe(
            true,
          );
          return slotId;
        }),
      );
      expect(
        new Set(slots).size,
        "The offset selects a different checklist slot",
      ).toBe(2);
      await page.goto("/admin/accounts");
      await expect(page).toHaveURL((url) =>
        url.pathname.startsWith("/student"),
      );
      await expect(
        page.getByRole("heading", { name: "Accounts and roles" }),
      ).toHaveCount(0);
    }

    if (role === "admin") {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.getByRole("button", { name: "Add account" }).click();
      const dialog = page.getByRole("dialog", { name: "Add account" });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("combobox", { name: "Faculty" }).click();
      await page.getByRole("option", { name: "Faculty of Computing" }).click();
      await dialog.getByRole("combobox", { name: "Department" }).click();
      await page
        .getByRole("option", {
          name: "Department of Computer Science and Technology",
        })
        .click();
      await expect
        .poll(() =>
          dialog.evaluate(
            (element) => element.scrollWidth - element.clientWidth,
          ),
        )
        .toBeLessThanOrEqual(1);
      await expect
        .poll(() =>
          dialog.evaluate((element) => {
            const { left, right } = element.getBoundingClientRect();
            const viewport = document.documentElement;
            return Math.max(
              -left,
              right - viewport.clientWidth,
              viewport.scrollWidth - viewport.clientWidth,
            );
          }),
        )
        .toBeLessThanOrEqual(1);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  });
}
