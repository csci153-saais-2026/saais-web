import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { AlertIcon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/features/form-field";
import { signInSchema, type SignInValues } from "@/components/features/sign-in-schema";

/** Email/password form with Google option, "keep me signed in", and a rejection banner. */
function SignInForm({
  error,
  onSubmit,
  onGoogle,
  forgotHref = "/forgot-password",
}: {
  error?: React.ReactNode;
  /** Called only with valid values. Return a Promise to disable the button while it runs. */
  onSubmit: (values: SignInValues) => void | Promise<void>;
  onGoogle?: () => void;
  forgotHref?: string;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", keep: false },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-4"
    >
      <div className="mb-2">
        <h2 className="text-3xl">Sign in</h2>
        <p className="mt-2 text-muted-foreground">
          Use your institutional account. If your email is not registered, ask
          your department administrator to provision it.
        </p>
      </div>
      <FormField
        label="Institutional email"
        htmlFor="email"
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
      </FormField>
      <FormField
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
      </FormField>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <Controller
            control={control}
            name="keep"
            render={({ field }) => (
              <Checkbox
                id="keep"
                name={field.name}
                ref={field.ref}
                checked={field.value}
                onBlur={field.onBlur}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
          <Label htmlFor="keep" className="font-normal text-muted-foreground">
            Keep me signed in
          </Label>
        </span>
        <Link to={forgotHref} className="font-semibold">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        Sign in
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-2">
        <Separator className="flex-1" /> OR <Separator className="flex-1" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogle}
      >
        Continue with Google
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}

export { SignInForm };
