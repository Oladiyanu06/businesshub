import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { NewEmployeeForm } from "./new-employee-form";

export default async function NewEmployeePage() {
  const session = await requirePermission("employee.manage");
  const supabase = await createClient();

  const [{ data: branches }, { data: roles }] = await Promise.all([
    supabase
      .from("branches")
      .select("id, name")
      .eq("business_id", session.business.id)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("roles")
      .select("id, key, name, description")
      .eq("business_id", session.business.id)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/app/employees"
        className={buttonStyles({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Employees
      </Link>

      <PageHeader
        eyebrow="People & access"
        title="Register an employee"
        description="Creates a sign-in account, links it to this business, and applies only the roles you select."
      />

      <NewEmployeeForm
        branches={branches ?? []}
        roles={roles ?? []}
        businessName={session.business.name}
      />
    </div>
  );
}
