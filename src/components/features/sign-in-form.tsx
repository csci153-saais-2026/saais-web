import * as React from "react"
import { Link } from "react-router"
import { TriangleAlertIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { FormField } from "@/components/features/form-field"

/** Email/password form with Google option, "keep me signed in", and a rejection banner. */
function SignInForm({
  error,
  onSubmit,
  onGoogle,
  forgotHref = "/auth/forgot-password",
}: {
  error?: React.ReactNode
  onSubmit: (values: { email: string; password: string; keep: boolean }) => void
  onGoogle?: () => void
  forgotHref?: string
}) {
  const [keep, setKeep] = React.useState(false)

  function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    onSubmit({ email: String(f.get("email")), password: String(f.get("password")), keep })
  }

  return (
    <form onSubmit={handle} className="grid gap-4">
      <div className="mb-2">
        <h2 className="text-3xl">Sign in</h2>
        <p className="mt-2 text-muted-foreground">
          Use your institutional account. If your email is not registered, ask your department administrator to
          provision it.
        </p>
      </div>
      <Button type="button" variant="outline" size="lg" className="h-11 w-full bg-card font-semibold" onClick={onGoogle}>
        Continue with Google
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-2">
        <Separator className="flex-1" /> OR <Separator className="flex-1" />
      </div>
      <FormField label="Institutional email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="username" className="h-11 bg-card" />
      </FormField>
      <FormField label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-11 bg-card" />
      </FormField>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <Checkbox id="keep" checked={keep} onCheckedChange={(v) => setKeep(v === true)} />
          <Label htmlFor="keep" className="font-normal text-muted-foreground">
            Keep me signed in
          </Label>
        </span>
        <Link to={forgotHref} className="font-semibold">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="h-11 w-full font-semibold">
        Sign in
      </Button>
      {error && (
        <Alert variant="destructive" className="border-status-fail/30 bg-status-fail-bg">
          <TriangleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}

export { SignInForm }
