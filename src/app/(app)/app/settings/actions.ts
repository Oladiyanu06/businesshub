"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActionSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; success?: string } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name.").max(120),
  legalName: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.email("Enter a valid contact email.").trim().toLowerCase().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().min(2, "Enter a country.").max(80),
  timezone: z.string().trim().min(2, "Enter a timezone.").max(80),
  logoUrl: z.url("Enter a valid image URL.").trim().max(500).optional().or(z.literal("")),
});

export async function updateBusinessProfile(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await getActionSession("business.settings");
  if (!session) return { error: "You are not authorised to change business settings." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    country: formData.get("country"),
    timezone: formData.get("timezone"),
    logoUrl: formData.get("logoUrl") ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const input = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: input.name,
      legal_name: input.legalName || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      country: input.country,
      timezone: input.timezone,
      logo_url: input.logoUrl || null,
    })
    .eq("id", session.business.id);

  if (error) return { error: "The business profile could not be saved." };

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { success: "Business profile updated." };
}

const operationalSchema = z.object({
  expenseApprovalThreshold: z.coerce
    .number({ error: "Enter a valid amount." })
    .min(0, "The threshold cannot be negative.")
    .max(1_000_000_000_000, "That threshold is too large."),
  offlineSessionHours: z.coerce
    .number({ error: "Enter a valid number of hours." })
    .int("Use whole hours.")
    .min(1, "At least 1 hour.")
    .max(720, "At most 720 hours (30 days)."),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),
});

export async function updateOperationalSettings(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await getActionSession("business.settings");
  if (!session) return { error: "You are not authorised to change business settings." };

  const parsed = operationalSchema.safeParse({
    expenseApprovalThreshold: formData.get("expenseApprovalThreshold"),
    offlineSessionHours: formData.get("offlineSessionHours"),
    currency: formData.get("currency"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      expense_approval_threshold: parsed.data.expenseApprovalThreshold,
      offline_session_hours: parsed.data.offlineSessionHours,
      currency: parsed.data.currency,
    })
    .eq("id", session.business.id);

  if (error) return { error: "The operational settings could not be saved." };

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { success: "Operational settings updated." };
}
