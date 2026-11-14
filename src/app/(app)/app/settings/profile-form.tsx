"use client";

import { useActionState } from "react";

import { updateBusinessProfile, type SettingsState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ProfileForm({
  business,
}: {
  business: {
    name: string;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string;
    timezone: string;
    logoUrl: string | null;
  };
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateBusinessProfile,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" htmlFor="name" required className="sm:col-span-2">
          <Input id="name" name="name" defaultValue={business.name} maxLength={120} required />
        </Field>
        <Field label="Legal name" htmlFor="legalName">
          <Input id="legalName" name="legalName" defaultValue={business.legalName ?? ""} maxLength={160} />
        </Field>
        <Field label="Contact email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={business.email ?? ""}
            autoComplete="off"
          />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={business.phone ?? ""} maxLength={30} />
        </Field>
        <Field label="Logo URL" htmlFor="logoUrl">
          <Input
            id="logoUrl"
            name="logoUrl"
            defaultValue={business.logoUrl ?? ""}
            maxLength={500}
            placeholder="https://…"
          />
        </Field>
        <Field label="Address" htmlFor="address" className="sm:col-span-2">
          <Input id="address" name="address" defaultValue={business.address ?? ""} maxLength={200} />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={business.city ?? ""} maxLength={80} />
        </Field>
        <Field label="State / region" htmlFor="state">
          <Input id="state" name="state" defaultValue={business.state ?? ""} maxLength={80} />
        </Field>
        <Field label="Country" htmlFor="country" required>
          <Input id="country" name="country" defaultValue={business.country} maxLength={80} required />
        </Field>
        <Field label="Timezone" htmlFor="timezone" required>
          <Input id="timezone" name="timezone" defaultValue={business.timezone} maxLength={80} required />
        </Field>
      </div>

      <SubmitButton size="sm" pendingLabel="Saving…">
        Save profile
      </SubmitButton>
    </form>
  );
}
