import type { Metadata } from "next";

import { AppShell, type NavSection } from "@/components/app-shell";
import { requirePlatformAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin();

  const nav: NavSection[] = [
    {
      title: "Platform",
      items: [{ href: "/platform", label: "Businesses", icon: "businesses" }],
    },
    {
      title: "Governance",
      items: [
        { href: "/platform/audit", label: "Platform audit", icon: "platformAudit" },
        { href: "/platform/activity", label: "My sign-in activity", icon: "activity" },
      ],
    },
  ];

  const name = session.platformAdmin?.fullName ?? "Platform Administrator";
  const email = session.platformAdmin?.email ?? "";

  return (
    <AppShell
      nav={nav}
      workspaceName="BUSINESSHUB Platform"
      workspaceMeta="Software operations"
      userName={name}
      userEmail={email}
      userLabel="Platform Administrator"
      isPlatform
    >
      {children}
    </AppShell>
  );
}
