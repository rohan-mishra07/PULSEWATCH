
import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const addMemberSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});
