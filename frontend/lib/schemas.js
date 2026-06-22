// lib/schemas.js
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const repoUrlSchema = z.object({
  repoUrl: z
    .string()
    .url("Please enter a valid URL.")
    .regex(
      /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\/)?$/,
      "Must be a valid GitHub repository URL (e.g., https://github.com/facebook/react)",
    ),
});
