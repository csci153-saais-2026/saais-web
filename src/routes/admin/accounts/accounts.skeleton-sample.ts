import {
  layoutSample,
  sampleRows,
} from "@/components/features/skeleton-sample";
import type { ApiSchema } from "@/lib/api";

type Account = ApiSchema<"AccountSummary">;

/** Layout-only account rows so the admin accounts table can be measured on first visit. */
export const ADMIN_ACCOUNTS_SKELETON_SAMPLE: Account[] = sampleRows(8, (i) =>
  layoutSample<Account>({
    profile: {
      id: `sample-${i}`,
      role: "adviser",
      email: "person@example.edu",
      full_name: "Sample Person Name",
      status: "active",
      invitation_status: "accepted",
    },
    role_assignments: [{ role: "adviser" }],
  }),
);
