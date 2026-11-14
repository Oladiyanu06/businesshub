"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActionSession } from "@/lib/auth/session";
import { generateEmployeeNumber, generateTemporaryPassword } from "@/lib/auth/passwords";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EmployeeState =
  | {
      error?: string;
      success?: string;
      credentials?: {
        employeeId: string;
        fullName: string;
        email: string;
        employeeNumber: string;
        tempPassword: string;
      };
    }
  | undefined;

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the employee's full name.").max(120),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  employeeNumber: z.string().trim().max(30).optional().or(z.literal("")),
  branchId: z.uuid("Choose a branch.").optional().or(z.literal("")),
  designation: z.string().trim().max(80).optional().or(z.literal("")),
});

export async function provisionEmployee(
  _state: EmployeeState,
  formData: FormData,
): Promise<EmployeeState> {
  const session = await getActionSession("employee.manage");
  if (!session) return { error: "You are not authorised to register employees." };

  const parsed = createSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    employeeNumber: formData.get("employeeNumber") ?? "",
    branchId: formData.get("branchId") || "",
    designation: formData.get("designation") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const input = parsed.data;
  const roleIds = formData
    .getAll("roleIds")
    .map((value) => String(value))
    .filter((value) => z.uuid().safeParse(value).success);

  const supabase = await createClient();

  // Validate every role belongs to this business before touching Auth.
  if (roleIds.length > 0) {
    const { data: validRoles } = await supabase
      .from("roles")
      .select("id")
      .eq("business_id", session.business.id)
      .in("id", roleIds);

    if ((validRoles ?? []).length !== roleIds.length) {
      return { error: "One or more selected roles are invalid." };
    }
  }

  const tempPassword = generateTemporaryPassword();
  const employeeNumber =
    input.employeeNumber || generateEmployeeNumber();

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      must_change_password: true,
    },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "Could not create the sign-in account.";
    return {
      error: /already|registered|exists/i.test(message)
        ? "An account with that email already exists."
        : message,
    };
  }

  const { data: employeeId, error: provisionError } = await supabase.rpc(
    "provision_employee",
    {
      p_business_id: session.business.id,
      p_user_id: created.user.id,
      p_full_name: input.fullName,
      p_email: input.email,
      p_phone: input.phone || null,
      p_employee_number: employeeNumber,
      p_branch_id: input.branchId || null,
      p_designation: input.designation || null,
      p_role_ids: roleIds,
    },
  );

  if (provisionError || !employeeId) {
    await admin.auth.admin.deleteUser(created.user.id);

    if (/duplicate|23505/i.test(provisionError?.message ?? "")) {
      return { error: "That employee number is already in use in this business." };
    }
    if (/not authorised|42501/i.test(provisionError?.message ?? "")) {
      return { error: "You are not authorised to register employees." };
    }
    return { error: "The employee could not be provisioned. No account was kept." };
  }

  revalidatePath("/app/employees");
  revalidatePath("/app");

  return {
    credentials: {
      employeeId: String(employeeId),
      fullName: input.fullName,
      email: input.email,
      employeeNumber,
      tempPassword,
    },
  };
}

const updateSchema = z.object({
  employeeId: z.uuid(),
  fullName: z.string().trim().min(2, "Enter the employee's full name.").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  branchId: z.uuid().optional().or(z.literal("")),
  designation: z.string().trim().max(80).optional().or(z.literal("")),
});

export async function updateEmployee(
  _state: EmployeeState,
  formData: FormData,
): Promise<EmployeeState> {
  const session = await getActionSession("employee.manage");
  if (!session) return { error: "You are not authorised to edit employees." };

  const parsed = updateSchema.safeParse({
    employeeId: formData.get("employeeId"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
    branchId: formData.get("branchId") || "",
    designation: formData.get("designation") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("employees")
    .update({
      full_name: input.fullName,
      phone: input.phone || null,
      branch_id: input.branchId || null,
      designation: input.designation || null,
    })
    .eq("id", input.employeeId)
    .eq("business_id", session.business.id);

  if (error) return { error: "The employee record could not be updated." };

  revalidatePath(`/app/employees/${input.employeeId}`);
  revalidatePath("/app/employees");
  return { success: "Employee details updated." };
}

const statusSchema = z.object({
  employeeId: z.uuid(),
  status: z.enum(["active", "suspended", "terminated"]),
});

export async function setEmployeeStatus(formData: FormData) {
  const session = await getActionSession("employee.manage");
  if (!session) return;

  const parsed = statusSchema.safeParse({
    employeeId: formData.get("employeeId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  if (parsed.data.employeeId === session.employee.id) {
    revalidatePath(`/app/employees/${parsed.data.employeeId}`);
    return;
  }

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, user_id, status")
    .eq("id", parsed.data.employeeId)
    .eq("business_id", session.business.id)
    .maybeSingle();

  if (!employee) return;

  const { error } = await supabase
    .from("employees")
    .update({ status: parsed.data.status })
    .eq("id", employee.id)
    .eq("business_id", session.business.id);

  if (error) {
    revalidatePath(`/app/employees/${employee.id}`);
    return;
  }

  // Block or restore sign-in at the Auth provider. RLS already checks the
  // employee status on every request, so access is cut immediately.
  const admin = createAdminClient();
  if (parsed.data.status === "active") {
    await admin.auth.admin.updateUserById(employee.user_id, { ban_duration: "none" });
  } else {
    await admin.auth.admin.updateUserById(employee.user_id, {
      ban_duration: "876000h",
    });
  }

  revalidatePath(`/app/employees/${employee.id}`);
  revalidatePath("/app/employees");
  revalidatePath("/app/devices");
  revalidatePath("/app");
}

const rolesSchema = z.object({
  employeeId: z.uuid(),
  roleIds: z.array(z.uuid()).max(30),
});

export type RoleAssignmentState = { error?: string; success?: string } | undefined;

export async function assignRoles(
  _state: RoleAssignmentState,
  formData: FormData,
): Promise<RoleAssignmentState> {
  const session = await getActionSession("employee.manage");
  if (!session) return { error: "You are not authorised to assign roles." };

  const parsed = rolesSchema.safeParse({
    employeeId: formData.get("employeeId"),
    roleIds: formData.getAll("roleIds").map((value) => String(value)),
  });

  if (!parsed.success) return { error: "Check the selected roles." };

  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", parsed.data.employeeId)
    .eq("business_id", session.business.id)
    .maybeSingle();

  if (!employee) return { error: "Employee not found." };

  const { data: validRoles } = await supabase
    .from("roles")
    .select("id")
    .eq("business_id", session.business.id)
    .in("id", parsed.data.roleIds);

  if ((validRoles ?? []).length !== parsed.data.roleIds.length) {
    return { error: "One or more roles are invalid." };
  }

  const { data: current } = await supabase
    .from("employee_roles")
    .select("role_id")
    .eq("employee_id", employee.id)
    .eq("business_id", session.business.id);

  const currentIds = new Set((current ?? []).map((row) => row.role_id));
  const nextIds = new Set(parsed.data.roleIds);
  const toAdd = parsed.data.roleIds.filter((roleId) => !currentIds.has(roleId));
  const toRemove = Array.from(currentIds).filter((roleId) => !nextIds.has(roleId));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("employee_roles")
      .delete()
      .eq("employee_id", employee.id)
      .eq("business_id", session.business.id)
      .in("role_id", toRemove);

    if (error) {
      return {
        error: /administrator/i.test(error.message)
          ? "This is the last active Business Administrator. Assign another administrator first."
          : "The roles could not be updated.",
      };
    }
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("employee_roles").insert(
      toAdd.map((roleId) => ({
        business_id: session.business.id,
        employee_id: employee.id,
        role_id: roleId,
        assigned_by: session.employee.id,
      })),
    );

    if (error) return { error: "The roles could not be updated." };
  }

  revalidatePath(`/app/employees/${employee.id}`);
  revalidatePath("/app/employees");
  return { success: "Role assignments updated." };
}

export type PasswordResetState =
  | { error?: string; password?: string; email?: string }
  | undefined;

export async function resetEmployeePassword(
  _state: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const session = await getActionSession("employee.manage");
  if (!session) return { error: "You are not authorised to reset passwords." };

  const employeeId = String(formData.get("employeeId") ?? "");
  if (!z.uuid().safeParse(employeeId).success) {
    return { error: "Invalid employee." };
  }

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, user_id, email, full_name")
    .eq("id", employeeId)
    .eq("business_id", session.business.id)
    .maybeSingle();

  if (!employee) return { error: "Employee not found." };

  const tempPassword = generateTemporaryPassword();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(employee.user_id, {
    password: tempPassword,
  });

  if (error) return { error: "The password could not be reset." };

  await supabase
    .from("employees")
    .update({ must_change_password: true })
    .eq("id", employee.id)
    .eq("business_id", session.business.id);

  revalidatePath(`/app/employees/${employee.id}`);

  return { password: tempPassword, email: employee.email };
}

const deviceSchema = z.object({ deviceId: z.uuid() });

export async function revokeDevice(formData: FormData) {
  const session = await getActionSession("device.manage");
  if (!session) return;

  const parsed = deviceSchema.safeParse({ deviceId: formData.get("deviceId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("devices")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: session.employee.id,
    })
    .eq("id", parsed.data.deviceId)
    .eq("business_id", session.business.id);

  revalidatePath("/app/devices");
  revalidatePath(`/app/employees/${String(formData.get("employeeId") ?? "")}`);
}
