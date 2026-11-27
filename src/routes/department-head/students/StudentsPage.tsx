import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { DIRECTORY_SKELETON_SAMPLE } from "../shared/directory.skeleton-sample";
import { useState } from "react";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { StudentDirectoryTable } from "@/components/features/student-directory-table";
import { StudentDirectoryFilters } from "../shared/StudentDirectoryFilters";
import { StudentRecordDialog } from "./StudentRecordDialog";
import { StudentImportDialog } from "./StudentImportDialog";
import { useDirectoryStudents } from "../shared/dh-queries";
import { QueryMessage } from "../shared/dh-ui";
import type { DirectoryStudent } from "../shared/students-types";

export default function StudentsPage() {
  const directory = useDirectoryStudents();
  // While loading, the skeleton is measured from sample rows.
  const students = directory.data ?? DIRECTORY_SKELETON_SAMPLE;
  const [search, setSearch] = useState("");
  const [curriculum, setCurriculum] = useState("all");
  const [adviser, setAdviser] = useState("all");
  const [selected, setSelected] = useState<{
    student: DirectoryStudent;
    trigger: HTMLButtonElement | null;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const query = search.trim().toLowerCase();
  const filtered = students.filter(
    (student) =>
      (student.name.toLowerCase().includes(query) ||
        student.studentNumber.toLowerCase().includes(query)) &&
      (curriculum === "all" || student.curriculum === curriculum) &&
      (adviser === "all" || student.adviser === adviser),
  );

  const heading = (
    <PageHeading
      title="Students"
      subtitle="Find and review students across the Department of Computer Science and Technology."
      actions={
        <Button onClick={() => setImportOpen(true)}>
          <UploadIcon />
          Import spreadsheet
        </Button>
      }
    />
  );
  if (directory.isError && !directory.data)
    return (
      <>
        {heading}
        <QueryMessage query={directory} label="students" />
      </>
    );

  return (
    <AccountSkeleton
      id="dh-students"
      data={directory.data}
      sample={DIRECTORY_SKELETON_SAMPLE}
      label="Loading students…"
    >
      {() => (
        <>
          {heading}
          <Panel
            title="Department directory"
            description={`${students.length} enrolled students · BSCS and BSIT · AY 2025–2026, 1st semester`}
            flush
          >
            <StudentDirectoryFilters
              students={students}
              search={search}
              curriculum={curriculum}
              adviser={adviser}
              onSearchChange={setSearch}
              onCurriculumChange={setCurriculum}
              onAdviserChange={setAdviser}
              onReset={() => {
                setSearch("");
                setCurriculum("all");
                setAdviser("all");
              }}
            />
            <StudentDirectoryTable
              variant="department-head"
              students={filtered}
              totalCount={students.length}
              onSelectStudent={(student, trigger) =>
                setSelected({ student, trigger })
              }
            />
          </Panel>
          {selected && (
            <StudentRecordDialog
              key={selected.student.id}
              student={selected.student}
              returnFocusTo={selected.trigger}
              onClose={() => setSelected(null)}
            />
          )}
          {importOpen && (
            <StudentImportDialog onClose={() => setImportOpen(false)} />
          )}
        </>
      )}
    </AccountSkeleton>
  );
}
