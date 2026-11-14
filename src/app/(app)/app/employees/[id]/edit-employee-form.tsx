"use client";

import { useActionState } from "react";

import { updateEmployee, type EmployeeState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function EditEmployeeForm({
  employee,
  branches,
}: {
  employee: {
    id: string;
    fullName: string;
    phone: string | null;
    branchId: string | null;
    designation: string | null;
  };
  branches: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useActionState<EmployeeState, FormData>(
    updateEmployee,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="employeeId" value={employee.id} />
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <Field label="Full name" htmlFor="edit-fullName" required>
        <Input
          id="edit-fullName"
          name="fullName"
          defaultValue={employee.fullName}
          maxLength={120}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone number" htmlFor="edit-phone">
          <Input
            id="edit-phone"
            name="phone"
            type="tel"
            defaultValue={employee.phone ?? ""}
            maxLength={30}
          />
        </Field>

        <Field label="Job designation" htmlFor="edit-designation">
          <Input
            id="edit-designation"
            name="designation"
            defaultValue={employee.designation ?? ""}
            maxLength={80}
          />
        </Field>
      </div>

      <Field label="Assigned branch" htmlFor="edit-branch">
        <Select id="edit-branch" name="branchId" defaultValue={employee.branchId ?? ""}>
          <option value="">No branch (central staff)</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton size="sm" pendingLabel="Saving…">
        Save details
      </SubmitButton>
    </form>
  );
}
