import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CurriculumTermTableRow = {
  id: string;
  courseOrSlot: string;
  requiredUnits: number | null;
  type: string;
};

type CurriculumTermTableProps = {
  rows: readonly CurriculumTermTableRow[];
  onEdit?: (row: CurriculumTermTableRow) => void;
  onDelete?: (row: CurriculumTermTableRow) => void;
  actionsDisabled?: boolean;
  emptyMessage?: string;
};

export function CurriculumTermTable({
  rows,
  onEdit,
  onDelete,
  actionsDisabled = false,
  emptyMessage = "No requirements are available for this term.",
}: CurriculumTermTableProps) {
  const showActions = Boolean(onEdit || onDelete);

  return (
    <Table responsive>
      <TableHeader className="bg-secondary">
        <TableRow>
          <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
            Course / slot
          </TableHead>
          <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
            Required units
          </TableHead>
          <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
            Type
          </TableHead>
          {showActions && (
            <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
              Actions
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={showActions ? 4 : 3}
              className="py-6 text-center text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell
                label="Course / slot"
                className="font-medium text-foreground"
              >
                <span
                  className="block max-w-72 truncate"
                  title={row.courseOrSlot}
                >
                  {row.courseOrSlot}
                </span>
              </TableCell>
              <TableCell
                label="Required units"
                className="font-mono text-sm"
              >
                {row.requiredUnits ?? "Unavailable"}
              </TableCell>
              <TableCell
                label="Type"
                className="text-muted-foreground"
              >
                {row.type}
              </TableCell>
              {showActions && (
                <TableCell label="Actions">
                  <div className="flex flex-wrap gap-2">
                    {onEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actionsDisabled}
                        aria-label={`Edit requirement ${row.courseOrSlot}`}
                        onClick={() => onEdit(row)}
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={actionsDisabled}
                        aria-label={`Delete requirement ${row.courseOrSlot}`}
                        onClick={() => onDelete(row)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
