import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(2, "Username must be at least 2 characters.")
  .max(40, "Keep your username under 40 characters.")
  .regex(
    /^[A-Za-z0-9_]+(?: [A-Za-z0-9_]+)*$/,
    "Use letters, numbers, spaces, or underscores.",
  );

export const signUpSchema = z
  .object({
    username: usernameSchema,
    email: z.email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give your group a name.")
    .max(60, "Keep the group name under 60 characters."),
});

export const splitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give this Split a name.")
    .max(80),
  occurredOn: z.string().min(1, "Pick a date."),
  emoji: z.string().min(1).max(8).default("🧾"),
});

export const expenseSchema = z.object({
  name: z.string().trim().min(1, "What did you order?").max(80),
  amount: z.string().min(1, "Enter a price."),
  type: z.enum(["individual", "shared"]),
  participantIds: z.array(z.string().uuid()).min(1, "Assign at least one person."),
});

export const feeSchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: z.enum(["tax", "service", "other"]),
  amount: z.string().min(1),
});

export function firstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}
