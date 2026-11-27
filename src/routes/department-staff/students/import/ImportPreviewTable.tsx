import { Truncate } from "@/components/ui/truncate";
import type { StudentImportBatchResult } from "./student-import.api";

const outcomeLabels: Record<
  StudentImportBatchResult["results"][number]["outcome"],
  string
> = {
  valid: "Valid",
  warning: "Warning",
  error: "Error",
  imported: "Imported",
};

const outcomeClasses: Record<
  StudentImportBatchResult["results"][number]["outcome"],
  string
> = {
  valid: "bg-[var(--status-pass-bg)] text-[var(--status-pass)]",
  imported: "bg-[var(--status-pass-bg)] text-[var(--status-pass)]",
  warning: "bg-[var(--status-inc-bg)] text-[var(--status-inc)]",
  error: "bg-[var(--status-fail-bg)] text-[var(--status-fail)]",
};

const outcomeDotClasses: Record<
  StudentImportBatchResult["results"][number]["outcome"],
  string
> = {
  valid: "bg-[var(--status-pass)]",
  imported: "bg-[var(--status-pass)]",
  warning: "bg-[var(--status-inc)]",
  error: "bg-[var(--status-fail)]",
};

function countLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export function ImportPreviewTable({
  result,
}: {
  result: StudentImportBatchResult;
}) {
  return (
    <section aria-label="Server import results" className="space-y-3">
      <h3 className="font-semibold">Import results</h3>
      <p role="status" className="text-sm">
        {countLabel(result.imported_count, "student")} imported.{" "}
        {countLabel(result.warning_count, "warning")},{" "}
        {countLabel(result.error_count, "error")}.
      </p>
      {result.warning_count > 0 && (
        <p className="rounded-md border border-[var(--notice-advisory-border)] bg-[var(--notice-advisory-bg)] p-3 text-sm text-[var(--notice-advisory)]">
          {countLabel(result.warning_count, "row")} need
          {result.warning_count === 1 ? "s" : ""} review and were not imported.
        </p>
      )}
      <div className="max-h-64 overflow-auto rounded-md border">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            Server outcomes for imported student rows
          </caption>
          <thead className="sticky top-0 bg-cream-deep text-foreground">
            <tr>
              <th scope="col" className="p-3">
                Row
              </th>
              <th scope="col" className="p-3">
                Student number
              </th>
              <th scope="col" className="p-3">
                Email
              </th>
              <th scope="col" className="p-3">
                Outcome
              </th>
              <th scope="col" className="p-3">
                Message
              </th>
            </tr>
          </thead>
          <tbody>
            {result.results.map((rowResult) => (
              <tr
                key={`${rowResult.row_number}-${rowResult.student_number}`}
                className="border-t border-line-soft"
              >
                <td className="p-3">{rowResult.row_number}</td>
                <td className="p-3">{rowResult.student_number}</td>
                <td className="p-3">
                  <Truncate text={rowResult.email} className="max-w-64" />
                </td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-semibold ${outcomeClasses[rowResult.outcome]}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2 rounded-full ${outcomeDotClasses[rowResult.outcome]}`}
                    />
                    {outcomeLabels[rowResult.outcome]}
                  </span>
                </td>
                <td className="p-3">
                  <Truncate
                    text={rowResult.message || "—"}
                    className="max-w-96"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
