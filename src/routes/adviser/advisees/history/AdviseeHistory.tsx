import { useState } from "react";
import { useParams } from "react-router";
import { AdviserPage } from "../../Adviser";
import { useAuth } from "@/hooks/use-auth";
import { useScopedRequest } from "../use-scoped-request";
import { getStudentHistory } from "./history.api";
import { Button } from "@/components/ui/button";

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
const humanizeAction = (action: string) => {
  const text = action.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const roleLabel = (role?: string | null) =>
  role === "student"
    ? "Advisee"
    : role
      ? role.charAt(0).toUpperCase() + role.slice(1).replaceAll("_", " ")
      : "System";

/* Values below mirror mockup/Adviser/AdviseeHistory.dc.html. */
const FIELD =
  "rounded-[4px] border border-border bg-white px-3 py-[9px] text-[14px] leading-[1.4] text-foreground hover:border-[#C9C1A6] focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238C8A76' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;
const TH =
  "whitespace-nowrap border-b border-border bg-secondary px-[14px] py-[10px] text-left text-[11.5px] font-semibold uppercase tracking-[0.09em] text-muted-2";
const TD =
  "border-b border-line-soft px-[14px] py-[11px] text-left align-top text-[13.5px]";

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
  const { data, error } = useScopedRequest(
    JSON.stringify([user?.id, activeRole, id, revision]),
    !!user?.id && !!id,
    () => getStudentHistory(id!),
  );
  const rows = data?.filter(
    (row) =>
      (filter === "all" ||
        (filter === "student"
          ? row.actor_id === id
          : row.actor_role === "adviser")) &&
      [row.actor_name, row.action, row.details_summary, row.actor_role].some(
        (value) => value?.toLowerCase().includes(search.trim().toLowerCase()),
      ),
  );
  const studentName =
    data?.find((row) => row.actor_id === id && row.actor_name)?.actor_name ??
    "the advisee";
  return (
    <AdviserPage title="Audit log" tab="history" sample={false}>
      {!data && !error && <p role="status">Loading history…</p>}
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
            <div className="flex flex-wrap gap-2.5">
              <input
                type="search"
                aria-label="Search the audit log"
                placeholder="Search the log"
                className={`${FIELD} w-55 placeholder:text-muted-2`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                aria-label="Filter by actor"
                className={`${FIELD} w-47.5 cursor-pointer appearance-none bg-size-[16px] bg-position-[right_9px_center] bg-no-repeat pr-7.5`}
                style={{ backgroundImage: SELECT_CHEVRON }}
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as typeof filter)
                }
              >
                <option value="all">All actions</option>
                <option value="student">Advisee actions</option>
                <option value="adviser">Adviser actions</option>
              </select>
            </div>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Date and time
                  </th>
                  <th scope="col" className={TH}>
                    Actor
                  </th>
                  <th scope="col" className={TH}>
                    Action
                  </th>
                  <th scope="col" className={TH}>
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const d = new Date(row.created_at);
                  return (
                    <tr key={row.id} className="hover:bg-accent">
                      <td className={TD}>
                        <time dateTime={row.created_at}>
                          <div className="font-mono text-[13px]">
                            {formatDate(d)}
                          </div>
                          <div className="font-mono text-[12px] text-muted-2">
                            {formatTime(d)}
                          </div>
                        </time>
                      </td>
                      <td className={TD}>
                        <div className="font-semibold">
                          {row.actor_name ?? "System"}
                        </div>
                        <div className="mt-0.75">
                          <RolePill role={row.actor_role} />
                        </div>
                      </td>
                      <td className={TD}>{humanizeAction(row.action)}</td>
                      <td className={`${TD} text-[#3C4A2A]`}>
                        {row.details_summary ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
    </AdviserPage>
  );
}
