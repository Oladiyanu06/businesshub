import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Layers,
  MessageCircle,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const WHATSAPP_NUMBER = "2349069149629";
const WHATSAPP_MESSAGE =
  "Hello BUSINESSHUB, I would like to request a pilot for my business.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

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
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "sales",
          telephone: "+2349069149629",
          availableLanguage: ["en"],
        },
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
        <div className="flex items-center gap-3">
          <Link
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles({ size: "sm" })}
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            Request a pilot
          </Link>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Multi-tenant · Role-based access · Audit-ready
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Know exactly who has access.
              <span className="block text-brand-700">Across every branch.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
              BUSINESSHUB gives multi-branch businesses one controlled system for
              people, roles and branches — with strict per-business isolation and an
              audit trail for every important change.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles({ size: "lg" })}
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Request a pilot
              </Link>
              <Link href="/login" className={buttonStyles({ variant: "outline", size: "lg" })}>
                Sign in <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Pilot onboarding includes setup, staff import, role configuration and training.
            </p>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
              {[
                ["Isolation", "Row-level security"],
                ["Access", "45 permission keys"],
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
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  Demo Retail Ltd
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <ShieldCheck className="h-3 w-3" aria-hidden /> Isolated workspace
                </span>
              </div>
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Employees", "12"],
                    ["Branches", "3"],
                    ["Roles", "6"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-100 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                    <span className="text-xs font-semibold text-slate-700">Recent changes</span>
                    <span className="text-[10px] font-medium text-slate-400">Audit trail</span>
                  </div>
                  {[
                    ["Role updated", "Branch Manager", "2m ago"],
                    ["Employee added", "Ikeja Branch", "18m ago"],
                    ["Device registered", "POS-02", "1h ago"],
                    ["Branch renamed", "Lekki Branch", "Yesterday"],
                  ].map(([action, detail, when]) => (
                    <div
                      key={action + detail}
                      className="flex items-center justify-between border-b border-slate-50 px-3 py-2.5 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-800">{action}</p>
                        <p className="text-[11px] text-slate-500">{detail}</p>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">{when}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Every change is recorded against the person who made it.
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-slate-400">
              Illustrative workspace
            </p>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50/60">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <Layers className="h-5 w-5" />,
                title: "Branch oversight",
                body: "Create branches, assign staff and choose the default location. Deactivate a branch without deleting its history.",
              },
              {
                icon: <Users className="h-5 w-5" />,
                title: "Accountable people",
                body: "Six role templates and 45 permission keys. Employees receive the union of their roles — nothing is granted by accident.",
              },
              {
                icon: <ShieldCheck className="h-5 w-5" />,
                title: "Separation by design",
                body: "Every record is bound to one business by row-level security. Platform staff can provision and suspend, but cannot read tenant records.",
              },
              {
                icon: <ScrollText className="h-5 w-5" />,
                title: "Records that hold",
                body: "An append-only audit trail and sign-in history show who changed what, and when — across every branch.",
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

        <section id="pilot" className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid gap-10 rounded-2xl border border-slate-200 bg-slate-950 p-8 text-white sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-200">
                Pilot programme · Limited slots
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Join the first businesses on BUSINESSHUB.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300">
                We onboard a small number of businesses at a time so setup is done
                properly. We configure your branches, import your team, set up roles
                and train your administrator — then hand over working accounts.
              </p>
              <ul className="mt-5 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
                {[
                  "Branch and role setup",
                  "Employee import",
                  "Administrator training",
                  "Direct WhatsApp support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center gap-3 rounded-xl bg-white/5 p-6 ring-1 ring-inset ring-white/10">
              <p className="text-sm text-slate-300">
                Tell us how many branches and staff you have. We will reply on WhatsApp
                with pilot scope and pricing.
              </p>
              <Link
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles({ size: "lg", className: "w-full justify-center" })}
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Request a pilot on WhatsApp
              </Link>
              <p className="text-center text-[11px] text-slate-400">
                No card required. Pricing is agreed before onboarding.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              In development · Phase 2
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Sales, inventory, customers and expenses are the next modules. They are
              not available yet and are not part of the pilot. Pilot businesses get
              first access when they ship.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} BUSINESSHUB</span>
          <div className="flex items-center gap-4">
            <Link
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-500 hover:text-slate-800"
            >
              WhatsApp
            </Link>
            <Link href="/login" className="hover:text-slate-700">
              Sign in
            </Link>
            <span>Commercial licensing is handled directly.</span>
          </div>
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
