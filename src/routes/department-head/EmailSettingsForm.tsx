import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FormField } from "@/components/features/form-field"
import { Panel } from "@/components/features/panel"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDepartmentHeadPreview } from "./preview-state"

const emailSchema = z.object({
  senderEmail: z.string().trim().regex(/^[^\s@]+@vsu\.edu\.ph$/i, "Use a VSU sender address ending in @vsu.edu.ph."),
})

export function EmailSettingsForm() {
  const { settings, updateSettings, notify } = useDepartmentHeadPreview()
  const [triggers, setTriggers] = useState(settings.notificationTriggers)
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema), defaultValues: { senderEmail: settings.senderEmail },
  })

  return (
    <Panel title="Department email notifications" description="A sample sender address and proposed notification choices. No email is sent.">
      <form noValidate onSubmit={handleSubmit(({ senderEmail }) => {
        updateSettings({ ...settings, senderEmail, notificationTriggers: triggers })
        notify("Email settings saved in this preview. No email was sent.")
      })}>
        <FormField label="Sender address" htmlFor="settings-sender" error={errors.senderEmail?.message}>
          <Input id="settings-sender" type="email" autoComplete="off" aria-invalid={Boolean(errors.senderEmail)} {...register("senderEmail")} />
        </FormField>
        <fieldset className="mt-5 space-y-3">
          <legend className="mb-2 text-sm font-semibold">Proposed notification events</legend>
          <p className="text-xs text-muted-foreground">Example choices for team review.</p>
          {([
            ["adviserReassignment", "Adviser reassignment"],
            ["curriculumTransferDecision", "Curriculum-transfer decision"],
            ["gradeEncodingClosure", "Grade-encoding closure"],
          ] as const).map(([name, label]) => (
            <div key={name} className="flex items-center gap-3">
              <Checkbox id={`trigger-${name}`} checked={triggers[name]} onCheckedChange={(checked) => setTriggers((current) => ({ ...current, [name]: checked === true }))} />
              <Label htmlFor={`trigger-${name}`} className="text-sm font-normal">{label}</Label>
            </div>
          ))}
        </fieldset>
        <Button type="submit" className="mt-5">Save email settings</Button>
      </form>
    </Panel>
  )
}
