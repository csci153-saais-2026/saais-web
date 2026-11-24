import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TermDialog } from "./TermDialog";
import type { AcademicTermRecord } from "./terms-api";

const DETAIL_LABEL = "text-xs text-muted-2";
const DETAIL_VALUE = "mt-1 text-[13.5px] font-medium text-foreground";

export function TermDetailsDialog({
  term,
  onClose,
}: {
  term: AcademicTermRecord | null;
  onClose: () => void;
}) {
  return (
    <TermDialog
      open={!!term}
      onOpenChange={(open) => !open && onClose()}
      title="Academic term details"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {term && (
        <dl className="grid grid-cols-2 gap-5">
          <div>
            <dt className={DETAIL_LABEL}>Academic year</dt>
            <dd className={DETAIL_VALUE}>{term.academicYear}</dd>
          </div>
          <div>
            <dt className={DETAIL_LABEL}>Semester</dt>
            <dd className={DETAIL_VALUE}>{term.semester}</dd>
          </div>
          <div>
            <dt className={DETAIL_LABEL}>Term dates</dt>
            <dd className={DETAIL_VALUE}>{term.termDates}</dd>
          </div>
          <div>
            <dt className={DETAIL_LABEL}>Encoding deadline</dt>
            <dd className={DETAIL_VALUE}>{term.encodingDeadline}</dd>
          </div>
          <div>
            <dt className={DETAIL_LABEL}>Status</dt>
            <dd className="mt-1">
              <StatusBadge
                status={term.status === "Open" ? "current" : "archived"}
              >
                {term.status}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <dt className={DETAIL_LABEL}>Closed by</dt>
            <dd className={DETAIL_VALUE}>
              {term.closedBy?.trim() || "Not recorded"}
            </dd>
          </div>
          {term.closureNote && (
            <div className="col-span-2">
              <dt className={DETAIL_LABEL}>Closure note</dt>
              <dd className={DETAIL_VALUE}>{term.closureNote}</dd>
            </div>
          )}
        </dl>
      )}
    </TermDialog>
  );
}
