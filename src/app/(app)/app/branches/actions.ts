"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActionSession } from "@/lib/auth/session";
import { generateBranchCode } from "@/lib/auth/passwords";
import { createClient } from "@/lib/supabase/server";

export type BranchState = { error?: string; success?: string } | undefined;

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter a branch name.").max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{0,15}$/, "Use up to 16 characters: A–Z, 0–9, hyphen.")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  isDefault: z.boolean(),
});

export async function createBranch(
  _state: BranchState,
  formData: FormData,
): Promise<BranchState> {
  const session = await getActionSession("branch.manage");
  if (!session) return { error: "You are not authorised to manage branches." };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code") ?? "",
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    isDefault: formData.get("isDefault") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const input = parsed.data;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("branches")
    .select("code")
    .eq("business_id", session.business.id);

  const usedCodes = (existing ?? []).map((row) => row.code);
  const code = input.code || generateBranchCode(input.name, usedCodes);

  if (usedCodes.includes(code)) {
    return { error: `The branch code ${code} is already in use.` };
  }

  if (input.isDefault) {
    await supabase
      .from("branches")
      .update({ is_default: false })
      .eq("business_id", session.business.id)
      .eq("is_default", true);
  }

  const { error } = await supabase.from("branches").insert({
    business_id: session.business.id,
    name: input.name,
    code,
    address: input.address || null,
    phone: input.phone || null,
    is_default: input.isDefault,
    status: "active",
  });

  if (error) {
    return {
      error: /duplicate|23505/i.test(error.message)
        ? "A branch with that code already exists."
        : "The branch could not be created.",
    };
  }

  revalidatePath("/app/branches");
  revalidatePath("/app");
  return { success: `${input.name} was created.` };
}

const updateSchema = z.object({
  branchId: z.uuid(),
  name: z.string().trim().min(1, "Enter a branch name.").max(120),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function updateBranch(
  _state: BranchState,
  formData: FormData,
): Promise<BranchState> {
  const session = await getActionSession("branch.manage");
  if (!session) return { error: "You are not authorised to manage branches." };

  const parsed = updateSchema.safeParse({
    branchId: formData.get("branchId"),
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("branches")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
    })
    .eq("id", parsed.data.branchId)
    .eq("business_id", session.business.id);

  if (error) return { error: "The branch could not be updated." };

  revalidatePath("/app/branches");
  return { success: "Branch updated." };
}

const statusSchema = z.object({
  branchId: z.uuid(),
  status: z.enum(["active", "inactive"]),
});

export async function setBranchStatus(formData: FormData) {
  const session = await getActionSession("branch.manage");
  if (!session) return;

  const parsed = statusSchema.safeParse({
    branchId: formData.get("branchId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("branches")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.branchId)
    .eq("business_id", session.business.id);

  revalidatePath("/app/branches");
  revalidatePath("/app");
}

const defaultSchema = z.object({ branchId: z.uuid() });

export async function setDefaultBranch(formData: FormData) {
  const session = await getActionSession("branch.manage");
  if (!session) return;

  const parsed = defaultSchema.safeParse({ branchId: formData.get("branchId") });
  if (!parsed.success) return;

  const supabase = await createClient();

  await supabase
    .from("branches")
    .update({ is_default: false })
    .eq("business_id", session.business.id)
    .eq("is_default", true);

  await supabase
    .from("branches")
    .update({ is_default: true })
    .eq("id", parsed.data.branchId)
    .eq("business_id", session.business.id);

  revalidatePath("/app/branches");
}
