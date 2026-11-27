import type { Status } from "@/components/ui/status-badge";

/** Status badge for a final grade value ('inc', 'dr', 'na' or a numeric grade); undefined when no outcome yet. */
export function outcomeStatus(final: string): Status | undefined {
  if (final === "inc" || final === "dr" || final === "na") return final;
  if (!final) return undefined;
  return Number(final) <= 3 ? "passed" : "failed";
}

export function outcomeRemark(final: string): string {
  if (final === "inc") return "INC";
  if (final === "dr") return "DR";
  if (final && Number(final) <= 3) return "Passed";
  if (final === "5.00") return "Failed";
  return "";
}
