export type StaffQueryFilters = Readonly<Record<string, unknown>>;

export const staffQueryKeys = {
  all: ["staff"] as const,
  scope: (profileId: string, departmentId: string) =>
    ["staff", profileId, departmentId] as const,
  resource: (
    profileId: string,
    departmentId: string,
    resource: string,
    filters: StaffQueryFilters = {},
  ) => ["staff", profileId, departmentId, resource, filters] as const,
};
