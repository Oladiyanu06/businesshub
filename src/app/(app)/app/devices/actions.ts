"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActionSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type DeviceState = { error?: string; success?: string } | undefined;

const registerSchema = z.object({
  deviceName: z.string().trim().min(1, "Name this device.").max(80),
  fingerprint: z
    .string()
    .trim()
    .min(32, "Device fingerprint is too short.")
    .max(128, "Device fingerprint is too long."),
  platform: z.string().trim().max(120).optional().or(z.literal("")),
  appVersion: z.string().trim().max(40).optional().or(z.literal("")),
});

export async function registerDevice(
  _state: DeviceState,
  formData: FormData,
): Promise<DeviceState> {
  const session = await getActionSession();
  if (!session) return { error: "Sign in to register a device." };

  const parsed = registerSchema.safeParse({
    deviceName: formData.get("deviceName"),
    fingerprint: formData.get("fingerprint"),
    platform: formData.get("platform") ?? "",
    appVersion: formData.get("appVersion") ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const input = parsed.data;
  const supabase = await createClient();

  // Re-registering the same fingerprint revives the device row rather than
  // creating duplicates (unique on business_id + fingerprint).
  const { data: existing } = await supabase
    .from("devices")
    .select("id, employee_id, status")
    .eq("business_id", session.business.id)
    .eq("device_fingerprint", input.fingerprint)
    .maybeSingle();

  if (existing) {
    if (existing.employee_id !== session.employee.id) {
      return { error: "This device is registered to another employee." };
    }
    if (existing.status === "active") {
      return { error: "This device is already registered." };
    }
    return {
      error:
        "This device was revoked. Ask an administrator to approve re-registration before using it.",
    };
  }

  const { error } = await supabase.from("devices").insert({
    business_id: session.business.id,
    employee_id: session.employee.id,
    device_name: input.deviceName,
    device_fingerprint: input.fingerprint,
    platform: input.platform || null,
    app_version: input.appVersion || null,
    status: "active",
    offline_expiry_hours: session.business.offlineSessionHours,
  });

  if (error) {
    return {
      error: /duplicate|23505/i.test(error.message)
        ? "This device is already registered."
        : "The device could not be registered.",
    };
  }

  revalidatePath("/app/devices");
  revalidatePath(`/app/employees/${session.employee.id}`);
  return { success: "Device registered for offline use." };
}

const revokeSchema = z.object({
  deviceId: z.uuid(),
  employeeId: z.uuid().optional(),
});

export async function revokeDevice(formData: FormData) {
  const session = await getActionSession("device.manage");
  if (!session) return;

  const parsed = revokeSchema.safeParse({
    deviceId: formData.get("deviceId"),
    employeeId: formData.get("employeeId") || undefined,
  });
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
  if (parsed.data.employeeId) {
    revalidatePath(`/app/employees/${parsed.data.employeeId}`);
  }
}

const heartbeatSchema = z.object({ deviceId: z.uuid() });

export async function heartbeatDevice(formData: FormData) {
  const session = await getActionSession();
  if (!session) return;

  const parsed = heartbeatSchema.safeParse({ deviceId: formData.get("deviceId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", parsed.data.deviceId)
    .eq("business_id", session.business.id)
    .eq("employee_id", session.employee.id)
    .eq("status", "active");
}
