import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BUSINESSHUB — Multi-branch business operations",
    template: "%s · BUSINESSHUB",
  },
  description:
    "Offline-first, multi-tenant business management for sales, inventory, branches, people and financial records.",
  applicationName: "BUSINESSHUB",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BUSINESSHUB",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
