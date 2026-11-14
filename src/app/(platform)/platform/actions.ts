"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { generateTemporaryPassword } from "@/lib/auth/passwords";
import { slugify } from "@/lib/utils";

export type ProvisionState =
  | {
      error?: string;
      result?: {
        businessId: string;
        businessName: string;
        slug: string;
        adminEmail: string;
        tempPassword: string;
      };
    }
  | undefined;

const provisionSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.")
    .max(60),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a three-letter currency code, e.g. NGN."),
  country: z.string().trim().min(2).max(80),
  timezone: z.string().trim().min(2).max(80),
  branchName: z.string().trim().min(2).max(120),
  adminFullName: z.string().trim().min(2, "Enter the administrator's full name.").max(120),
  adminEmail: z.email("Enter a valid administrator email.").trim().toLowerCase(),
  adminPhone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function provisionBusiness(
  _state: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  const session = await requirePlatformAdmin();
  if (!session.isPlatformAdmin) return { error: "Not authorised." };

  const parsed = provisionSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || slugify(String(formData.get("name") ?? "")),
    currency: formData.get("currency") || "NGN",
    country: formData.get("country") || "Nigeria",
    timezone: formData.get("timezone") || "Africa/Lagos",
    branchName: formData.get("branchName") || "Head Office",
    adminFullName: formData.get("adminFullName"),
    adminEmail: formData.get("adminEmail"),
    adminPhone: formData.get("adminPhone") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", input.slug)
    .maybeSingle();

  if (existing) return { error: "That workspace slug is already in use." };

  const tempPassword = generateTemporaryPassword();
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.adminEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: input.adminFullName,
      must_change_password: true,
    },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "Could not create the administrator account.";
    return {
      error: /already|registered|exists/i.test(message)
        ? "An account with that email already exists."
        : message,
    };
  }

  const { data, error } = await supabase.rpc("provision_business", {
    p_name: input.name,
    p_slug: input.slug,
    p_currency: input.currency,
    p_country: input.country,
    p_timezone: input.timezone,
    p_branch_name: input.branchName,
    p_admin_user_id: created.user.id,
    p_admin_full_name: input.adminFullName,
    p_admin_email: input.adminEmail,
    p_admin_phone: input.adminPhone || null,
  });

  if (error) {
    // Compensate: never leave a sign-in account without a tenant record.
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      error: /slug|duplicate|23505/i.test(error.message)
        ? "That workspace slug is already in use."
        : "The business could not be provisioned. No account was kept. Please retry.",
    };
  }

  const result = data as {
    business_id: string;
    branch_id: string;
    employee_id: string;
  };

  revalidatePath("/platform");
  revalidatePath("/platform/audit");

  return {
    result: {
      businessId: result.business_id,
      businessName: input.name,
      slug: input.slug,
      adminEmail: input.adminEmail,
      tempPassword,
    },
  };
}

const statusSchema = z.object({
  businessId: z.uuid(),
  status: z.enum(["active", "suspended", "archived"]),
});

export async function updateBusinessStatus(formData: FormData) {
  await requirePlatformAdmin();

  const parsed = statusSchema.safeParse({
    businessId: formData.get("businessId"),
    status: formData.get("status"),
  });

  if (!parsed.success) redirect("/platform?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.businessId);

  if (error) {
    redirect(`/platform/businesses/${parsed.data.businessId}?error=status`);
  }

  await supabase.rpc("log_platform_action", {
    p_action: `platform.business_${parsed.data.status}`,
    p_entity_type: "business",
    p_entity_id: parsed.data.businessId,
    p_metadata: { status: parsed.data.status },
  });

  revalidatePath("/platform");
  revalidatePath(`/platform/businesses/${parsed.data.businessId}`);
  redirect(`/platform/businesses/${parsed.data.businessId}?notice=status`);
}

export type LicensingState = { error?: string; success?: string } | undefined;

const licensingSchema = z.object({
  businessId: z.uuid(),
  licenseReference: z.string().trim().max(120).optional().or(z.literal("")),
  licensedUntil: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
    .optional()
    .or(z.literal("")),
  licenseNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function updateLicensing(
  _state: LicensingState,
  formData: FormData,
): Promise<LicensingState> {
  await requirePlatformAdmin();

  const parsed = licensingSchema.safeParse({
    businessId: formData.get("businessId"),
    licenseReference: formData.get("licenseReference") ?? "",
    licensedUntil: formData.get("licensedUntil") ?? "",
    licenseNotes: formData.get("licenseNotes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      license_reference: parsed.data.licenseReference || null,
      licensed_until: parsed.data.licensedUntil || null,
      license_notes: parsed.data.licenseNotes || null,
    })
    .eq("id", parsed.data.businessId);

  if (error) return { error: "The licence record could not be saved." };

  await supabase.rpc("log_platform_action", {
    p_action: "platform.licence_updated",
    p_entity_type: "business",
    p_entity_id: parsed.data.businessId,
    p_metadata: {
      license_reference: parsed.data.licenseReference || null,
      licensed_until: parsed.data.licensedUntil || null,
    },
  });

  revalidatePath(`/platform/businesses/${parsed.data.businessId}`);
  return { success: "Licensing record updated." };
}
