import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell, type NavSection } from "@/components/app-shell";
import { can } from "@/lib/permissions";
import { requireBusiness } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await requireBusiness();
  const supabase = await createClient();

  let branchName = "No branch assigned";
  if (session.employee.branchId) {
    const { data } = await supabase
      .from("branches")
      .select("name")
      .eq("id", session.employee.branchId)
      .maybeSingle();
    if (data?.name) branchName = data.name;
  }

  if (session.business.status !== "active") redirect("/suspended");

  const permissions = session.permissions;
  const nav: NavSection[] = [
    {
      title: "Workspace",
      items: [{ href: "/app", label: "Overview", icon: "overview" }],
    },
  ];

  const people = [
    can(permissions, "employee.view")
      ? { href: "/app/employees", label: "Employees", icon: "employees" as const }
      : null,
    can(permissions, "role.view")
      ? { href: "/app/roles", label: "Roles & permissions", icon: "roles" as const }
      : null,
    can(permissions, "device.view")
      ? { href: "/app/devices", label: "Devices", icon: "devices" as const }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  if (people.length > 0) nav.push({ title: "People & access", items: people });

  if (can(permissions, "branch.view")) {
    nav.push({
      title: "Operations",
      items: [{ href: "/app/branches", label: "Branches", icon: "branches" }],
    });
  }

  const governance = [
    can(permissions, "audit.view")
      ? { href: "/app/audit", label: "Audit trail", icon: "audit" as const }
      : null,
    can(permissions, "business.settings")
      ? { href: "/app/settings", label: "Business settings", icon: "settings" as const }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  if (governance.length > 0) nav.push({ title: "Governance", items: governance });

  const roleLabel =
    session.roles.map((role) => role.name).join(" · ") || session.employee.designation || "Employee";

  return (
    <AppShell
      nav={nav}
      workspaceName={session.business.name}
      workspaceMeta={`${branchName} · ${roleLabel}`}
      userName={session.employee.fullName}
      userEmail={session.employee.email}
      userLabel={roleLabel}
    >
      {children}
    </AppShell>
  );
}
