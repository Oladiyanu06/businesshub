"use client";

import { useActionState } from "react";

import { updateOperationalSettings, type SettingsState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function OperationalForm({
  business,
}: {
  business: {
    currency: string;
    expenseApprovalThreshold: number;
    offlineSessionHours: number;
  };
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateOperationalSettings,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Expense approval threshold"
          htmlFor="expenseApprovalThreshold"
          hint="Expenses at or above this amount need approval. Use 0 to require approval for all."
        >
          <Input
            id="expenseApprovalThreshold"
            name="expenseApprovalThreshold"
            type="number"
            min={0}
            step="0.01"
            defaultValue={business.expenseApprovalThreshold}
          />
        </Field>

        <Field
          label="Offline session window (hours)"
          htmlFor="offlineSessionHours"
          hint="How long an authorised device may keep working without contact. 1–720."
        >
          <Input
            id="offlineSessionHours"
            name="offlineSessionHours"
            type="number"
            min={1}
            max={720}
            step={1}
            defaultValue={business.offlineSessionHours}
          />
        </Field>

        <Field label="Currency" htmlFor="currency" hint="Used for all monetary records.">
          <Select id="currency" name="currency" defaultValue={business.currency}>
            {["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <SubmitButton size="sm" pendingLabel="Saving…">
        Save operational settings
      </SubmitButton>
    </form>
  );
}
