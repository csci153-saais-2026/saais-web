import type { SaaisRole } from "@/mocks/personas";

export const AUTH_RETURN_TO_KEY = "saais_auth_return_to";

export function safeInternalDestination(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return null;
  if (
    value.includes("\\") ||
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code < 0x20 || code === 0x7f;
    })
  )
    return null;
  try {
    const origin =
      typeof window === "undefined"
        ? "https://saais.invalid"
        : window.location.origin;
    const resolved = new URL(value, origin);
    if (resolved.origin !== origin || resolved.username || resolved.password)
      return null;
    if (
      resolved.pathname === "/login" ||
      resolved.pathname === "/auth/callback"
    )
      return null;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}

export function destinationAllowedForRoles(
  pathname: string,
  roles: readonly SaaisRole[],
): boolean {
  const under = (base: string) =>
    pathname === base || pathname.startsWith(`${base}/`);
  if (under("/student")) return roles.includes("student");
  if (under("/adviser")) return roles.includes("adviser");
  if (under("/department-head") || under("/dept-head"))
    return roles.includes("department_head");
  if (under("/department-staff") || under("/staff"))
    return roles.includes("department_staff");
  if (under("/dean")) return roles.includes("dean");
  if (under("/admin")) return roles.includes("admin");
  return pathname === "/settings" || pathname === "/change-password";
}
