import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/session";
import { NewRoleForm } from "./new-role-form";

export default async function NewRolePage() {
  await requirePermission("role.manage");

  return (
    <div className="space-y-6">
      <Link
        href="/app/roles"
        className={buttonStyles({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Roles
      </Link>

      <PageHeader
        eyebrow="People & access"
        title="Create a role"
        description="Custom roles let you give employees exactly the access they need — no more."
      />

      <NewRoleForm />
    </div>
  );
}
