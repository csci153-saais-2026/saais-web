import { z } from "zod";

/**
 * Client-side input checks for SignInForm only (required, well-formed email). Credential
 * errors come back from the auth call through the form's `error` prop. Password strength
 * rules belong on the reset-password and sign-up forms, not here.
 */
export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your institutional email.")
    .pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
  keep: z.boolean(),
});

export type SignInValues = z.infer<typeof signInSchema>;
