"use client";

import { useActionState } from "react";
import { useRef } from "react";
import { Fingerprint, MonitorSmartphone } from "lucide-react";

import { registerDevice, type DeviceState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const STORAGE_KEY = "businesshub.device.fingerprint";

function createFingerprint() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function ensureFingerprint() {
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && existing.length >= 32) return existing;
  const created = createFingerprint();
  window.localStorage.setItem(STORAGE_KEY, created);
  return created;
}

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown";
}

export function RegisterDeviceForm({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState<DeviceState, FormData>(registerDevice, undefined);
  const fingerprintRef = useRef<HTMLInputElement>(null);
  const platformRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        // Generate/read the device identity at submit time so the server-rendered
        // markup is hydration-stable and no state effect is needed.
        if (fingerprintRef.current) {
          fingerprintRef.current.value = ensureFingerprint();
        }
        if (platformRef.current) {
          platformRef.current.value = detectPlatform();
        }
      }}
      className="space-y-4"
    >
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <input type="hidden" name="fingerprint" ref={fingerprintRef} defaultValue="" />
      <input type="hidden" name="platform" ref={platformRef} defaultValue="" />

      <Field
        label="Device name"
        htmlFor="deviceName"
        hint="A recognisable label, e.g. “Front desk POS”."
        required
      >
        <Input
          id="deviceName"
          name="deviceName"
          defaultValue={defaultName}
          maxLength={80}
          required
        />
      </Field>

      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
        <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        <div>
          <p className="font-medium text-slate-700">Device fingerprint</p>
          <p className="mt-1">
            A random identifier is generated on this device and stored in this browser
            only. Offline sign-in and transaction sync (Phase 3) will be bound to it.
          </p>
        </div>
      </div>

      <SubmitButton size="sm" pendingLabel="Registering…">
        <MonitorSmartphone className="h-3.5 w-3.5" aria-hidden /> Register this device
      </SubmitButton>
    </form>
  );
}
