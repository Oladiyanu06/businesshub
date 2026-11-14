"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Building2,
  CloudOff,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { BrandMark } from "@/components/brand-mark";
import { ConnectionIndicator } from "@/components/connection-indicator";
import { useOnlineStatus } from "@/lib/use-online-status";
import { cn, initials } from "@/lib/utils";

export type NavIcon =
  | "overview"
  | "employees"
  | "roles"
  | "branches"
  | "devices"
  | "audit"
  | "settings"
  | "businesses"
  | "platformAudit"
  | "activity";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const icons: Record<NavIcon, React.ReactNode> = {
  overview: <LayoutDashboard className="h-4 w-4" aria-hidden />,
  employees: <Users className="h-4 w-4" aria-hidden />,
  roles: <ShieldCheck className="h-4 w-4" aria-hidden />,
  branches: <GitBranch className="h-4 w-4" aria-hidden />,
  devices: <MonitorSmartphone className="h-4 w-4" aria-hidden />,
  audit: <ScrollText className="h-4 w-4" aria-hidden />,
  settings: <Settings className="h-4 w-4" aria-hidden />,
  businesses: <Building2 className="h-4 w-4" aria-hidden />,
  platformAudit: <KeyRound className="h-4 w-4" aria-hidden />,
  activity: <Activity className="h-4 w-4" aria-hidden />,
};

export function AppShell({
  nav,
  workspaceName,
  workspaceMeta,
  userName,
  userEmail,
  userLabel,
  isPlatform = false,
  children,
}: {
  nav: NavSection[];
  workspaceName: string;
  workspaceMeta: string;
  userName: string;
  userEmail: string;
  userLabel: string;
  isPlatform?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const offline = !useOnlineStatus();

  const allItems = nav.flatMap((section) => section.items);
  const current =
    allItems
      .filter((item) =>
        item.href === "/app" || item.href === "/platform"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0] ?? allItems[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <Link href={isPlatform ? "/platform" : "/app"} className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[13px] font-semibold tracking-[0.16em] text-white">
              BUSINESSHUB
            </span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mx-3 mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <Building2 className="h-3 w-3" aria-hidden />
            {isPlatform ? "Platform" : "Workspace"}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-white" title={workspaceName}>
            {workspaceName}
          </p>
          <p className="truncate text-[11px] text-slate-400">{workspaceMeta}</p>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {nav.map((section) => (
            <div key={section.title}>
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === "/app" || item.href === "/platform"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-brand-600 text-white"
                            : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        <span className={active ? "text-white" : "text-slate-500"}>
                          {icons[item.icon]}
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initials(userName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">{userName}</p>
              <p className="truncate text-[11px] text-slate-500">{userLabel}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                title={`Sign out ${userEmail}`}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <p className="truncate text-sm font-medium text-slate-800">
              {current?.label ?? "Workspace"}
            </p>
            <div className="ml-auto flex items-center gap-3">
              <ConnectionIndicator />
              <span className="hidden text-xs text-slate-500 sm:block">{userEmail}</span>
            </div>
          </div>
          {offline ? (
            <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-800 sm:px-6">
              <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
              You are offline. The interface remains available; data changes require a
              connection and will be retried when it returns.
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
