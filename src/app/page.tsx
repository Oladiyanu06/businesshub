import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CloudOff,
  Fingerprint,
  Layers,
  ScrollText,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl("/icons/icon-512.png"),
        sameAs: ["https://github.com/Oladiyanu06/businesshub"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-sm font-semibold tracking-[0.18em] text-slate-900">
            BUSINESSHUB
          </span>
        </div>
        <Link href="/login" className={buttonStyles({ variant: "outline", size: "sm" })}>
          Sign in <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Offline-first · Multi-tenant · Audit-ready
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Run every branch.
              <span className="block text-brand-700">Even when the network fails.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
              BUSINESSHUB keeps sales, stock, people and money in one controlled
              system. Transactions continue on authorised devices while offline,
              then reconcile safely when the connection returns.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className={buttonStyles({ size: "lg" })}>
                Enter your workspace <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <span className="text-xs text-slate-500">
                Accounts are provisioned by your platform administrator.
              </span>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
              {[
                ["Isolation", "Row-level security"],
                ["Offline", "IndexedDB + PWA"],
                ["Records", "Append-only audit"],
              ].map(([term, description]) => (
                <div key={term}>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    {term}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-700">{description}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-slate-50 to-emerald-50 blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  <CloudOff className="h-3 w-3" aria-hidden /> Offline
                </span>
              </div>
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Today", "₦482,900", "text-slate-900"],
                    ["Transactions", "37", "text-slate-900"],
                    ["Pending sync", "4", "text-amber-600"],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="rounded-lg border border-slate-100 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                    <span className="text-xs font-semibold text-slate-700">Queued receipts</span>
                    <span className="text-[10px] font-medium text-slate-400">Device: POS-02</span>
                  </div>
                  {[
                    ["RCP-10482", "Cash · ₦18,500", "Awaiting sync"],
                    ["RCP-10483", "POS · ₦42,000", "Awaiting sync"],
                    ["RCP-10484", "Transfer · ₦9,250", "Awaiting sync"],
                  ].map(([receipt, amount, status]) => (
                    <div
                      key={receipt}
                      className="flex items-center justify-between border-b border-slate-50 px-3 py-2.5 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-800">{receipt}</p>
                        <p className="text-[11px] text-slate-500">{amount}</p>
                      </div>
                      <span className="text-[10px] font-medium text-amber-600">{status}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Signed transactions are queued locally and will be verified server-side.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50/60">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <CloudOff className="h-5 w-5" />,
                title: "Offline POS",
                body: "Sell, receipt and record payments without a connection. Synchronise with idempotent transaction IDs.",
              },
              {
                icon: <Layers className="h-5 w-5" />,
                title: "Branch control",
                body: "Stock movement ledgers, transfer workflows and central visibility across every location.",
              },
              {
                icon: <Fingerprint className="h-5 w-5" />,
                title: "Accountable people",
                body: "Roles, custom permissions, device registration and a traceable action history.",
              },
              {
                icon: <ScrollText className="h-5 w-5" />,
                title: "Records that hold",
                body: "Completed transactions are reversed — never silently edited or deleted.",
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  {feature.icon}
                </span>
                <h2 className="mt-4 text-sm font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" aria-hidden />
            One platform. Independently licensed businesses.
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-slate-400" aria-hidden />
            ONLINE · OFFLINE · SYNCHRONISING states are always visible in-app.
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} BUSINESSHUB</span>
          <span>Commercial licensing is managed outside this application.</span>
        </div>
      </footer>
    </div>
  );
}

function BrandMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 19V8.5L12 4l8 4.5V19"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 19v-5h6v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M4 19h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}
