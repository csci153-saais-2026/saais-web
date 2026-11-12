import { AdviserPage, StaticSelect } from "../../Adviser"
import { curriculumHistory, curriculumPreview } from "@/mocks/adviser.mock"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { Panel } from "@/components/features/panel"
import { StatGrid } from "@/components/features/stat-tile"
import { FormField } from "@/components/features/form-field"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export default function AdviseeCurriculum() {
  return (
    <AdviserPage title="Curriculum" tab="curriculum">
      <DataTablePanel
        title="Curriculum history"
        description="Every curriculum this student has followed, with the transfer that moved them."
        rows={curriculumHistory}
        rowKey={row => row.version}
        columns={[
          { header: "Curriculum version", cell: row => <b>{row.version}</b> },
          { header: "From", cell: row => row.from },
          { header: "To", cell: row => row.to },
          { header: "Note", cell: row => row.note },
        ]}
      />
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <Panel
          title="Endorse a curriculum transfer"
          description="The Department Head approves the transfer. Nothing changes until then."
        >
          <div className="grid gap-4">
            <StaticSelect
              id="transfer-target"
              label="Transfer to"
              value="BSCS 2018–2024"
              options={["BSCS 2018–2024", "BSIT 2025–present"]}
            />
            <FormField htmlFor="transfer-reason" label="Reason">
              <Textarea id="transfer-reason" value="" readOnly rows={4} placeholder="Explain why this transfer is recommended…" />
            </FormField>
            <div><Button type="button">Endorse transfer</Button></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Courses with the same code and title carry over automatically. Other courses carry over
            through the Department Head’s equivalencies; the rest are listed as not credited.
          </p>
        </Panel>
        <Panel
          title="Curriculum shift preview"
          description="Explore another curriculum without changing the record."
        >
          <StaticSelect
            id="preview-target"
            label="Target curriculum"
            value={curriculumPreview.target}
            options={curriculumPreview.targets}
            className="mb-5"
          />
          <StatGrid className="sm:grid-cols-3 lg:grid-cols-3" items={curriculumPreview.metrics} />
          <p className="text-sm text-muted-foreground">
            Read-only simulation. Elective mappings and equivalencies need adviser review;
            no course-code equivalence is assumed and no assignment is changed.
          </p>
        </Panel>
      </div>
    </AdviserPage>
  )
}
