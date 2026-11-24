import * as React from "react";
import {
  RecordTabs,
  StudentRecordHeader,
} from "@/components/features/student-record-header";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type StudentRecordDialogTab = { value: string; label: string };

const DEFAULT_TABS: StudentRecordDialogTab[] = [
  { value: "checklist", label: "Checklist" },
  { value: "grades", label: "Grades" },
  { value: "audit", label: "Audit log" },
];

/**
 * Student record modal for the Dean and Department Head portals: avatar header,
 * tab strip and tab content inside a scrolling dialog with a Close footer. The caller owns
 * the active tab and renders that tab's content as `children`, so each tab can load its own
 * data only when opened.
 */
function StudentRecordDialog({
  open,
  onOpenChange,
  student,
  tabs = DEFAULT_TABS,
  activeTab,
  onActiveTabChange,
  recordLabel = "Academic record",
  returnFocusTo,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Props of `StudentRecordHeader`; null while no student is selected. */
  student: React.ComponentProps<typeof StudentRecordHeader> | null;
  tabs?: StudentRecordDialogTab[];
  activeTab: string;
  onActiveTabChange: (value: string) => void;
  recordLabel?: string;
  returnFocusTo?: HTMLElement | null;
  /** Content of the active tab. */
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(85dvh,760px)] w-[calc(100%-2rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onCloseAutoFocus={(event) => {
          if (returnFocusTo?.isConnected) {
            event.preventDefault();
            returnFocusTo.focus();
          }
        }}
      >
        {/* The visible name lives in the record header; these give the dialog its accessible name. */}
        <DialogHeader className="sr-only">
          <DialogTitle>
            {student ? `${student.name} · ${recordLabel}` : "Student record"}
          </DialogTitle>
          <DialogDescription>
            {student
              ? [
                  student.studentNumber,
                  student.program,
                  student.curriculum,
                  student.yearLabel,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {student && (
            <>
              <StudentRecordHeader {...student} headingAs="h2" />
              <RecordTabs
                tabs={tabs}
                value={activeTab}
                onValueChange={onActiveTabChange}
                label="Student record sections"
              >
                <TabsContent value={activeTab}>{children}</TabsContent>
              </RecordTabs>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-3">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { StudentRecordDialog };
