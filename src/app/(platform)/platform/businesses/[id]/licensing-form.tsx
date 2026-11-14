"use client";

import { useActionState } from "react";

import { updateLicensing, type LicensingState } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function LicensingForm({
  businessId,
  licenseReference,
  licensedUntil,
  licenseNotes,
}: {
  businessId: string;
  licenseReference: string | null;
  licensedUntil: string | null;
  licenseNotes: string | null;
}) {
  const [state, formAction] = useActionState<LicensingState, FormData>(
    updateLicensing,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="businessId" value={businessId} />
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <Field label="Licence reference" htmlFor="licenseReference" hint="Agreement or invoice reference">
        <Input
          id="licenseReference"
          name="licenseReference"
          defaultValue={licenseReference ?? ""}
          maxLength={120}
          placeholder="LIC-2026-014"
        />
      </Field>

      <Field label="Licensed until" htmlFor="licensedUntil" hint="Recorded for reference only">
        <Input
          id="licensedUntil"
          name="licensedUntil"
          type="date"
          defaultValue={licensedUntil ?? ""}
        />
      </Field>

      <Field label="Notes" htmlFor="licenseNotes">
        <Textarea
          id="licenseNotes"
          name="licenseNotes"
          defaultValue={licenseNotes ?? ""}
          maxLength={2000}
          rows={3}
          placeholder="Commercial terms, contacts or renewal notes."
        />
      </Field>

      <SubmitButton size="sm" pendingLabel="Saving…">
        Save licence record
      </SubmitButton>
    </form>
  );
}
