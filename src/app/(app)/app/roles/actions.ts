"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getActionSession } from "@/lib/auth/session";
import { isPermissionKey } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export type RoleState = { error?: string; success?: string } | undefined;

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter a role name.").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function createRole(
  _state: RoleState,
  formData: FormData,
): Promise<RoleState> {
  const session = await getActionSession("role.manage");
  if (!session) return { error: "You are not authorised to create roles." };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const permissions = Array.from(
    new Set(formData.getAll("permissions").map((value) => String(value))),
  ).filter(isPermissionKey);

  const supabase = await createClient();
  const baseKey =
    slugify(parsed.data.name).replace(/-/g, "_").slice(0, 40) || "custom_role";

  const { data: existing } = await supabase
    .from("roles")
    .select("key")
    .eq("business_id", session.business.id)
    .like("key", `${baseKey}%`);

  const used = new Set((existing ?? []).map((role) => role.key));
  let key = baseKey;
  let counter = 2;
  while (used.has(key)) {
    key = `${baseKey}_${counter}`;
    counter += 1;
  }

  const { data: role, error } = await supabase
    .from("roles")
    .insert({
      business_id: session.business.id,
      key,
      name: parsed.data.name,
      description: parsed.data.description || null,
      is_system: false,
    })
    .select("id")
    .single();

  if (error || !role) {
    return { error: "The role could not be created." };
  }

  if (permissions.length > 0) {
    const { error: permissionError } = await supabase.from("role_permissions").insert(
      permissions.map((permission) => ({
        business_id: session.business.id,
        role_id: role.id,
        permission_key: permission,
      })),
    );

    if (permissionError) {
      await supabase.from("roles").delete().eq("id", role.id);
      return { error: "The role permissions could not be saved." };
    }
  }

  revalidatePath("/app/roles");
  redirect(`/app/roles/${role.id}`);
}

const permissionsSchema = z.object({
  roleId: z.uuid(),
  permissions: z.array(z.string()).max(200),
});

export async function updateRolePermissions(
  _state: RoleState,
  formData: FormData,
): Promise<RoleState> {
  const session = await getActionSession("role.manage");
  if (!session) return { error: "You are not authorised to change roles." };

  const parsed = permissionsSchema.safeParse({
    roleId: formData.get("roleId"),
    permissions: formData.getAll("permissions").map((value) => String(value)),
  });

  if (!parsed.success) return { error: "Check the selected permissions." };

  const permissions = Array.from(new Set(parsed.data.permissions)).filter(isPermissionKey);
  const supabase = await createClient();

  const { data: role } = await supabase
    .from("roles")
    .select("id, key, is_system")
    .eq("id", parsed.data.roleId)
    .eq("business_id", session.business.id)
    .maybeSingle();

  if (!role) return { error: "Role not found." };
  if (role.key === "business_admin") {
    return { error: "The Business Administrator role always retains full permissions." };
  }

  const { data: current } = await supabase
    .from("role_permissions")
    .select("permission_key")
    .eq("role_id", role.id)
    .eq("business_id", session.business.id);

  const currentKeys = new Set((current ?? []).map((row) => row.permission_key));
  const nextKeys = new Set(permissions);
  const toAdd = permissions.filter((permission) => !currentKeys.has(permission));
  const toRemove = Array.from(currentKeys).filter((permission) => !nextKeys.has(permission));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", role.id)
      .eq("business_id", session.business.id)
      .in("permission_key", toRemove);
    if (error) return { error: "The permissions could not be updated." };
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("role_permissions").insert(
      toAdd.map((permission) => ({
        business_id: session.business.id,
        role_id: role.id,
        permission_key: permission,
      })),
    );
    if (error) return { error: "The permissions could not be updated." };
  }

  revalidatePath(`/app/roles/${role.id}`);
  revalidatePath("/app/roles");
  return { success: "Role permissions updated." };
}

const detailsSchema = z.object({
  roleId: z.uuid(),
  name: z.string().trim().min(2, "Enter a role name.").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function updateRoleDetails(
  _state: RoleState,
  formData: FormData,
): Promise<RoleState> {
  const session = await getActionSession("role.manage");
  if (!session) return { error: "You are not authorised to edit roles." };

  const parsed = detailsSchema.safeParse({
    roleId: formData.get("roleId"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createClient();
  const { data: role } = await supabase
    .from("roles")
    .select("id, is_system")
    .eq("id", parsed.data.roleId)
    .eq("business_id", session.business.id)
    .maybeSingle();

  if (!role) return { error: "Role not found." };
  if (role.is_system) return { error: "System role names are fixed." };

  const { error } = await supabase
    .from("roles")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq("id", role.id)
    .eq("business_id", session.business.id);

  if (error) return { error: "The role could not be updated." };

  revalidatePath(`/app/roles/${role.id}`);
  revalidatePath("/app/roles");
  return { success: "Role updated." };
}

export async function deleteRole(formData: FormData) {
  const session = await getActionSession("role.manage");
  if (!session) return;

  const roleId = String(formData.get("roleId") ?? "");
  if (!z.uuid().safeParse(roleId).success) return;

  const supabase = await createClient();
  const { data: role } = await supabase
    .from("roles")
    .select("id, is_system")
    .eq("id", roleId)
    .eq("business_id", session.business.id)
    .maybeSingle();

  if (!role || role.is_system) {
    redirect("/app/roles?error=system_role");
  }

  const { count } = await supabase
    .from("employee_roles")
    .select("employee_id", { count: "exact", head: true })
    .eq("role_id", role.id)
    .eq("business_id", session.business.id);

  if ((count ?? 0) > 0) {
    redirect("/app/roles?error=assigned_role");
  }

  await supabase
    .from("roles")
    .delete()
    .eq("id", role.id)
    .eq("business_id", session.business.id);

  revalidatePath("/app/roles");
  redirect("/app/roles?notice=deleted");
}
