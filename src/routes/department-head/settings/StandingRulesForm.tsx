import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FormField } from "@/components/features/form-field"
import { Panel } from "@/components/features/panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSaveThresholds } from "../shared/dh-queries"
import { useNotify } from "../shared/notify-context"
import type { SettingsState } from "./settings-types"

const percentage = z.string().trim().min(1, "Enter a whole percentage from 0 to 100.")
  .regex(/^\d+$/, "Enter a whole percentage from 0 to 100.")
  .transform(Number).refine((value) => value <= 100, "Enter a whole percentage from 0 to 100.")
const rulesSchema = z.object({ warning: percentage, probation: percentage, dismissal: percentage })
  .refine((value) => value.warning < value.probation, { path: ["probation"], message: "Probation must be higher than warning." })
  .refine((value) => value.probation < value.dismissal, { path: ["dismissal"], message: "Dismissal must be higher than probation." })

export function StandingRulesForm({ settings }: { settings: SettingsState }) {
  const save = useSaveThresholds()
  const notify = useNotify()
  const { register, handleSubmit, setError, formState: { errors } } = useForm<z.input<typeof rulesSchema>, unknown, z.output<typeof rulesSchema>>({
    resolver: zodResolver(rulesSchema),
    defaultValues: Object.fromEntries(Object.entries(settings.thresholds).map(([key, value]) => [key, String(value)])),
  })

  return (
    <Panel title="Scholastic standing thresholds" description="Percentage of the term’s units failed. Defaults until VSU’s official values are confirmed.">
      <form noValidate onSubmit={handleSubmit(async (thresholds) => {
        try {
          await save.mutateAsync({ warning: thresholds.warning, probation: thresholds.probation, dismissal: thresholds.dismissal })
          notify("Standing rules saved.")
        } catch (failure) {
          setError("dismissal", { message: failure instanceof Error ? failure.message : "Standing rules could not be saved." })
        }
      })}>
        <div className="grid gap-4 sm:grid-cols-3">
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
        <div className="mt-[18px] flex justify-end"><Button type="submit" disabled={save.isPending}>Save</Button></div>
      </form>
    </Panel>
  )
}
