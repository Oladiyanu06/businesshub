import { z } from "zod";

const employeeSchema = z.object({
  id: z.uuid(),
  business_id: z.uuid(),
  employee_number: z.string(),
  full_name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  branch_id: z.uuid().nullable(),
  designation: z.string().nullable(),
  status: z.enum(["active", "suspended", "terminated"]),
  must_change_password: z.boolean(),
  last_login_at: z.string().nullable(),
});

const businessSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  currency: z.string(),
  timezone: z.string(),
  status: z.enum(["active", "suspended", "archived"]),
  logo_url: z.string().nullable(),
  offline_session_hours: z.number().int(),
  expense_approval_threshold: z.number(),
});

const roleSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  name: z.string(),
});

export const rawSessionContextSchema = z.object({
  user_id: z.uuid(),
  is_platform_admin: z.boolean(),
  platform_admin: z
    .object({ full_name: z.string(), email: z.string() })
    .nullable()
    .optional(),
  employee: employeeSchema.nullable(),
  business: businessSchema.nullable(),
  roles: z.array(roleSchema),
  permissions: z.array(z.string()),
});

export type RawSessionContext = z.infer<typeof rawSessionContextSchema>;
