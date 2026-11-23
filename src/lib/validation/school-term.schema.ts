import { z } from "zod";

export const schoolTermFormSchema = z
  .object({
    start_year: z
      .number({ error: "Enter the starting academic year." })
      .int("Enter a whole year.")
      .min(1900, "Use a year from 1900 through 2999.")
      .max(2999, "Use a year from 1900 through 2999."),
    end_year: z
      .number({ error: "Enter the ending academic year." })
      .int("Enter a whole year.")
      .min(1901, "Use a year from 1901 through 3000.")
      .max(3000, "Use a year from 1901 through 3000."),
    term_type: z.enum(["1st Semester", "2nd Semester", "Summer"]),
    starts_on: z.iso.date("Enter a valid start date."),
    ends_on: z.iso.date("Enter a valid actual end date."),
    encoding_deadline: z.iso.date("Enter a valid encoding deadline."),
  })
  .strict()
  .superRefine((values, context) => {
    if (values.end_year !== values.start_year + 1) {
      context.addIssue({
        code: "custom",
        path: ["end_year"],
        message: "The ending year must be one year after the starting year.",
      });
    }
    if (values.starts_on > values.ends_on) {
      context.addIssue({
        code: "custom",
        path: ["ends_on"],
        message: "The actual end date cannot precede the start date.",
      });
    }
    if (values.ends_on > values.encoding_deadline) {
      context.addIssue({
        code: "custom",
        path: ["encoding_deadline"],
        message: "The encoding deadline cannot precede the actual end date.",
      });
    }
  });

export type SchoolTermFormValues = z.infer<typeof schoolTermFormSchema>;
