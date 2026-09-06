import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1).max(80),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
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
