import * as React from "react"
import { Panel } from "@/components/features/panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type Column<T> = {
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
  /** Right-align numeric columns. */
  numeric?: boolean
}

/**
 * Panel wrapping an edge-to-edge data table with cream header row. Below 768px each row
 * becomes a stacked card with data-label captions (see index.css `.stack-table`).
 */
function DataTablePanel<T>({
  title,
  description,
  action,
  columns,
  rows,
  rowKey,
  empty = "No records match. Try another search or filter.",
  footer,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: string
  footer?: React.ReactNode
}) {
  return (
    <Panel title={title} description={description} action={action} flush>
     <Table className="stack-table">
        <TableHeader className="bg-secondary">
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={c.header}
                className={cn(
                  "text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase",
                  c.numeric && "text-right"
                )}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((c) => (
                <TableCell
                  key={c.header}
                  data-label={c.header}
                  className={cn("py-2.5 text-[13.5px]", c.numeric && "text-right font-mono", c.className)}
                >
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p>}
      {footer && <div className="border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">{footer}</div>}
    </Panel>
  )
}

export { DataTablePanel }
