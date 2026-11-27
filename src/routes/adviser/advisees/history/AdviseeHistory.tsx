import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { HISTORY_SKELETON_SAMPLE } from "../../adviser.skeleton-samples";
import { useState } from "react";
import { useParams } from "react-router";
import { AdviserPage } from "../../Adviser";
import { useAuth } from "@/hooks/use-auth";
import { useScopedRequest } from "../use-scoped-request";
import { getStudentHistory } from "./history.api";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/features/filter-bar";
import { Truncate } from "@/components/ui/truncate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const pad = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) =>
  `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
// Advisers get the bare action name when a reassignment reason is redacted.
const ACTION_LABELS: Record<string, string> = {
  reassignAdviser: "Adviser reassigned",
  bulkReassignAdvisers: "Advisers reassigned in bulk",
};
const humanizeAction = (action: string) => {
  if (Object.hasOwn(ACTION_LABELS, action)) return ACTION_LABELS[action];
  const text = action.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const formatAuditDetail = (detail?: string | null) => {
  const value = detail?.trim();
  if (!value) return "—";
  if (Object.hasOwn(ACTION_LABELS, value))
    return "Reason restricted to department heads";
  if (!/^[\w.-]+$/.test(value)) return value;
  return humanizeAction(value);
};
const roleLabel = (role?: string | null) =>
  role === "student"
    ? "Advisee"
    : role
      ? role.charAt(0).toUpperCase() + role.slice(1).replaceAll("_", " ")
      : "System";

function RolePill({ role }: { role?: string | null }) {
  const colors =
    role === "student"
      ? "bg-[#E4EDF4] text-[#2A4C6B]"
      : "bg-[#E7F0E2] text-[#2C6430]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] py-0.5 pr-2.25 pl-2 text-[12px] font-semibold tracking-[0.01em] ${colors}`}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      {roleLabel(role)}
    </span>
  );
}

export default function AdviseeHistory() {
  const { id } = useParams<{ id: string }>();
  const { user, activeRole } = useAuth();
  const [filter, setFilter] = useState<"all" | "student" | "adviser">("all");
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const { data: loadedData, error } = useScopedRequest(
    JSON.stringify([user?.id, activeRole, id, revision]),
    !!user?.id && !!id,
    () => getStudentHistory(id!),
  );
  // While loading, the skeleton is measured from sample content.
  const data = loadedData ?? (error ? undefined : HISTORY_SKELETON_SAMPLE);
  const rows = data
    ?.filter(
      (row) =>
        (filter === "all" ||
          (filter === "student"
            ? row.actor_id === id
            : row.actor_role === "adviser")) &&
        [row.actor_name, row.action, row.details_summary, row.actor_role].some(
          (value) => value?.toLowerCase().includes(search.trim().toLowerCase()),
        ),
    )
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  const studentName =
    data?.find((row) => row.actor_id === id && row.actor_name)?.actor_name ??
    "the advisee";
  return (
    <AdviserPage title="Audit log" tab="history" sample={false}>
      <AccountSkeleton
        id="AdviseeHistory-1"
        loading={!loadedData && !error}
        measured
        label="Loading history…"
      >
        {error && (
          <div role="alert">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setRevision((n) => n + 1)}>
              Try again
            </Button>
          </div>
        )}
        {rows && (
          <section
            aria-label="Audit log"
            className="min-w-0 overflow-hidden rounded-md border border-border bg-white leading-[1.55]"
          >
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
              <div>
                <h3 className="text-[15.5px] font-semibold tracking-[-0.011em]">
                  Audit log
                </h3>
                <p className="mt-0.75 text-[13px] text-muted-foreground">
                  Actions taken by {studentName} and by you on this advisee’s
                  record. Entries cannot be edited.
                </p>
              </div>
              <div className="w-full max-w-xl">
                <FilterBar
                  searchLabel="Search the audit log"
                  searchPlaceholder="Search the log"
                  search={search}
                  onSearchChange={setSearch}
                  filterLabel="Filter by actor"
                  filter={filter}
                  onFilterChange={(value) => setFilter(value as typeof filter)}
                  filterOptions={[
                    { value: "all", label: "All actions" },
                    { value: "student", label: "Advisee actions" },
                    { value: "adviser", label: "Adviser actions" },
                  ]}
                />
              </div>
            </header>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date and time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const d = new Date(row.created_at);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <time dateTime={row.created_at}>
                            <div className="font-mono text-[13px]">
                              {formatDate(d)}
                            </div>
                            <div className="font-mono text-[12px] text-muted-2">
                              {formatTime(d)}
                            </div>
                          </time>
                        </TableCell>
                        <TableCell>
                          <Truncate
                            text={row.actor_name ?? "System"}
                            className="font-semibold"
                          />
                          <div className="mt-0.75">
                            <RolePill role={row.actor_role} />
                          </div>
                        </TableCell>
                        <TableCell>{humanizeAction(row.action)}</TableCell>
                        <TableCell className="text-[#3C4A2A]">
                          <Truncate
                            text={formatAuditDetail(row.details_summary)}
                            className="max-w-96"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {rows.length === 0 && (
                <p className="px-5 py-8 text-center text-[13.5px] text-muted-foreground">
                  No entries match. Try another search or filter.
                </p>
              )}
            </div>
            <footer className="border-t border-line-soft px-2.75 text-[12.5px] text-muted-foreground">
              {rows.length} {rows.length === 1 ? "entry" : "entries"}
            </footer>
          </section>
        )}
      </AccountSkeleton>
    </AdviserPage>
  );
}
