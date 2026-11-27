import { FormField } from "@/components/features/form-field";
import { Panel } from "@/components/features/panel";
import { Input } from "@/components/ui/input";
import type { ApiSchema } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface ProfileDetailsPanelProps {
  readonly profile: ApiSchema<"Profile">;
  readonly programName?: string | null;
  readonly departmentName?: string | null;
  readonly collegeName?: string | null;
  readonly className?: string;
}

/**
 * Read-only Student Profile details panel displaying identity and academic unit fields.
 */
export function ProfileDetailsPanel({
  profile,
  programName,
  departmentName,
  collegeName,
  className,
}: ProfileDetailsPanelProps) {
  return (
    <Panel
      title="Profile details"
      description="Read-only. Ask your administrator or department staff to correct these details."
      className={cn(className)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="profile-full-name">
          <Input
            id="profile-full-name"
            name="full_name"
            type="text"
            value={profile.full_name}
            disabled
            className="min-h-11 md:min-h-[38px]"
          />
        </FormField>

        <FormField label="Student number" htmlFor="profile-student-number">
          <Input
            id="profile-student-number"
            name="student_number"
            type="text"
            value={profile.student_number ?? "—"}
            disabled
            className="min-h-11 font-mono tabular-nums md:min-h-[38px]"
          />
        </FormField>

        <FormField label="Institutional email" htmlFor="profile-email">
          <Input
            id="profile-email"
            name="email"
            type="email"
            value={profile.email}
            disabled
            className="min-h-11 md:min-h-[38px]"
          />
        </FormField>

        <FormField label="Role" htmlFor="profile-role">
          <Input
            id="profile-role"
            name="role"
            type="text"
            value={profile.role}
            disabled
            className="min-h-11 md:min-h-[38px]"
          />
        </FormField>

        <FormField label="Program" htmlFor="profile-program">
          <Input
            id="profile-program"
            name="program"
            type="text"
            value={programName?.trim() || "—"}
            disabled
            className="min-h-11 md:min-h-[38px]"
          />
        </FormField>

        <FormField label="Department" htmlFor="profile-department">
          <Input
            id="profile-department"
            name="department"
            type="text"
            value={departmentName?.trim() || "—"}
            disabled
            className="min-h-11 md:min-h-[38px]"
          />
        </FormField>

        <FormField label="College" htmlFor="profile-college">
          <Input
            id="profile-college"
            name="college"
            type="text"
            value={collegeName?.trim() || "—"}
            disabled
            className="min-h-11 md:min-h-[38px]"
          />
        </FormField>
      </div>
    </Panel>
  );
}
