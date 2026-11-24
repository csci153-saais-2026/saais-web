import { AccountSkeleton } from "@/components/features/loading-skeletons";
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
  const students = directory.data ?? [];
  const [search, setSearch] = useState("");
  const [curriculum, setCurriculum] = useState("all");
  const [adviser, setAdviser] = useState("all");
  const [selected, setSelected] = useState<DirectoryStudent | null>(null);
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
              onSelectStudent={setSelected}
            />
          </Panel>
          {selected && (
            <StudentRecordDialog
              key={selected.id}
              student={selected}
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
