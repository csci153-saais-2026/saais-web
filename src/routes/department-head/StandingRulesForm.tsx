import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FormField } from "@/components/features/form-field"
import { Panel } from "@/components/features/panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDepartmentHeadPreview } from "./preview-state"

const percentage = z.string().trim().min(1, "Enter a whole percentage from 0 to 100.")
  .regex(/^\d+$/, "Enter a whole percentage from 0 to 100.")
  .transform(Number).refine((value) => value <= 100, "Enter a whole percentage from 0 to 100.")
const rulesSchema = z.object({ warning: percentage, probation: percentage, dismissal: percentage })
  .refine((value) => value.warning < value.probation, { path: ["probation"], message: "Probation must be higher than warning." })
  .refine((value) => value.probation < value.dismissal, { path: ["dismissal"], message: "Dismissal must be higher than probation." })

export function StandingRulesForm() {
  const { settings, updateSettings, notify } = useDepartmentHeadPreview()
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof rulesSchema>, unknown, z.output<typeof rulesSchema>>({
    resolver: zodResolver(rulesSchema),
    defaultValues: Object.fromEntries(Object.entries(settings.thresholds).map(([key, value]) => [key, String(value)])),
  })

  return (
    <Panel title="Scholastic standing thresholds" description="Percentage of the term’s units failed. These sample values await confirmation of official rules.">
      <form noValidate onSubmit={handleSubmit((thresholds) => {
        updateSettings({ ...settings, thresholds: { warning: thresholds.warning, probation: thresholds.probation, dismissal: thresholds.dismissal } })
        notify("Standing rules saved in this preview.")
      })}>
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          {([
            ["warning", "Warning from (%)"],
            ["probation", "Probation from (%)"],
            ["dismissal", "Dismissal from (%)"],
          ] as const).map(([name, label]) => (
            <FormField key={name} label={label} htmlFor={`standing-${name}`} error={errors[name]?.message}>
              <Input id={`standing-${name}`} type="number" min="0" max="100" step="1" inputMode="numeric" aria-invalid={Boolean(errors[name])} {...register(name)} />
            </FormField>
          ))}
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Use whole percentages from 0–100, ordered warning &lt; probation &lt; dismissal.</p>
        <Button type="submit">Save standing rules</Button>
      </form>
    </Panel>
  )
}
