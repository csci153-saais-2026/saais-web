import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FormField } from "@/components/features/form-field"
import { Panel } from "@/components/features/panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSaveSenderEmail } from "../shared/dh-queries"
import { useNotify } from "../shared/notify-context"
import type { SettingsState } from "./settings-types"

const emailSchema = z.object({
  senderEmail: z.string().trim().regex(/^[^\s@]+@vsu\.edu\.ph$/i, "Use a VSU sender address ending in @vsu.edu.ph."),
})

export function EmailSettingsForm({ settings }: { settings: SettingsState }) {
  const save = useSaveSenderEmail()
  const notify = useNotify()
  const { register, handleSubmit, setError, formState: { errors } } = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema), defaultValues: { senderEmail: settings.senderEmail },
  })

  return (
    <Panel title="Department email notifications" description="Sender address for department email notifications.">
      <form noValidate onSubmit={handleSubmit(async ({ senderEmail }) => {
        try {
          await save.mutateAsync(senderEmail)
          notify("Email settings saved.")
        } catch (failure) {
          setError("senderEmail", { message: failure instanceof Error ? failure.message : "Email settings could not be saved." })
        }
      })}>
        <FormField label="Sender address" htmlFor="settings-sender" error={errors.senderEmail?.message}>
          <Input id="settings-sender" type="email" autoComplete="off" aria-invalid={Boolean(errors.senderEmail)} {...register("senderEmail")} />
        </FormField>
        <Button type="submit" className="mt-5" disabled={save.isPending}>Save email settings</Button>
      </form>
    </Panel>
  )
}
