import {
  layoutSample,
  sampleRows,
} from "@/components/features/skeleton-sample";
import type { DepartmentAccount } from "./accounts.api";

/** Layout-only account rows so the accounts table can be measured on first visit. */
export const ACCOUNTS_SKELETON_SAMPLE = {
  accounts: sampleRows(8, (i) =>
    layoutSample<DepartmentAccount>({
      profile: {
        id: `sample-${i}`,
        role: "student",
        email: "person@example.edu",
        full_name: "Sample Person Name",
        status: "active",
        invitation_status: "accepted",
      },
      role_assignments: [{ role: "adviser" }],
    }),
  ),
  hasNext: false,
};
