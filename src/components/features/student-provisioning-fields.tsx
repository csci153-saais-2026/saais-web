import { FormField } from "@/components/features/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface StudentProvisioningOption {
  value: string;
  label: string;
}

export interface StudentProvisioningFieldsProps {
  idPrefix: string;
  disabled?: boolean;
  studentNumber: string;
  entryYear: string;
  programId: string;
  curriculumVersionId: string;
  adviserId: string;
  programs: readonly StudentProvisioningOption[];
  curricula: readonly StudentProvisioningOption[];
  advisers: readonly StudentProvisioningOption[];
  programsDisabled?: boolean;
  loadingPrograms?: boolean;
  loadingCurricula?: boolean;
  loadingAdvisers?: boolean;
  studentNumberError?: string;
  entryYearError?: string;
  programError?: string;
  curriculumError?: string;
  adviserError?: string;
  onStudentNumberChange: (value: string) => void;
  onEntryYearChange: (value: string) => void;
  onProgramChange: (value: string) => void;
  onCurriculumChange: (value: string) => void;
  onAdviserChange: (value: string) => void;
}

export function StudentProvisioningFields({
  idPrefix,
  disabled = false,
  studentNumber,
  entryYear,
  programId,
  curriculumVersionId,
  adviserId,
  programs,
  curricula,
  advisers,
  programsDisabled = false,
  loadingPrograms = false,
  loadingCurricula = false,
  loadingAdvisers = false,
  studentNumberError,
  entryYearError,
  programError,
  curriculumError,
  adviserError,
  onStudentNumberChange,
  onEntryYearChange,
  onProgramChange,
  onCurriculumChange,
  onAdviserChange,
}: StudentProvisioningFieldsProps) {
  return (
    <section className="grid gap-4 rounded-md border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">Student provisioning</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Student number, program, active curriculum, and an eligible active
          adviser are required by the invitation contract.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Student number"
          htmlFor={`${idPrefix}-student-number`}
          hint="Format: YY-N-NNNNN."
          error={studentNumberError}
        >
          <Input
            id={`${idPrefix}-student-number`}
            maxLength={64}
            required
            value={studentNumber}
            disabled={disabled}
            aria-invalid={Boolean(studentNumberError)}
            onChange={(event) =>
              onStudentNumberChange(event.currentTarget.value)
            }
          />
        </FormField>
        <FormField
          label="Entry year (optional)"
          htmlFor={`${idPrefix}-entry-year`}
          error={entryYearError}
        >
          <Input
            id={`${idPrefix}-entry-year`}
            type="number"
            min={1900}
            max={3000}
            inputMode="numeric"
            value={entryYear}
            disabled={disabled}
            aria-invalid={Boolean(entryYearError)}
            onChange={(event) => onEntryYearChange(event.currentTarget.value)}
          />
        </FormField>
      </div>
      <FormField
        label="Program"
        htmlFor={`${idPrefix}-program`}
        error={programError}
      >
        <Select
          value={programId || "none"}
          onValueChange={(value) =>
            onProgramChange(value === "none" ? "" : value)
          }
          disabled={disabled || loadingPrograms || programsDisabled}
        >
          <SelectTrigger
            id={`${idPrefix}-program`}
            className="h-11! w-full"
            aria-required="true"
            aria-invalid={Boolean(programError)}
          >
            <SelectValue placeholder="Select a program" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            align="start"
            avoidCollisions={false}
          >
            {programs.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Curriculum"
          htmlFor={`${idPrefix}-curriculum`}
          error={curriculumError}
        >
          <Select
            value={curriculumVersionId || "none"}
            onValueChange={(value) =>
              onCurriculumChange(value === "none" ? "" : value)
            }
            disabled={disabled || loadingCurricula || !programId}
          >
            <SelectTrigger
              id={`${idPrefix}-curriculum`}
              className="h-11! w-full"
              aria-required="true"
              aria-invalid={Boolean(curriculumError)}
            >
              <SelectValue placeholder="Select an active curriculum" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              align="start"
              avoidCollisions={false}
            >
              {curricula.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Initial adviser"
          htmlFor={`${idPrefix}-adviser`}
          error={adviserError}
        >
          <Select
            value={adviserId || "none"}
            onValueChange={(value) =>
              onAdviserChange(value === "none" ? "" : value)
            }
            disabled={disabled || loadingAdvisers || !programId}
          >
            <SelectTrigger
              id={`${idPrefix}-adviser`}
              className="h-11! w-full"
              aria-required="true"
              aria-invalid={Boolean(adviserError)}
            >
              <SelectValue placeholder="Select an eligible adviser" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              align="start"
              avoidCollisions={false}
            >
              {advisers.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </section>
  );
}
