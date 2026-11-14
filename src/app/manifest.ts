import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BUSINESSHUB — Business operations",
    short_name: "BUSINESSHUB",
    description:
      "Offline-first, multi-tenant business management for sales, inventory, branches, people and financial records.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f6f7fb",
    theme_color: "#0f172a",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Workspace overview",
        short_name: "Overview",
        url: "/app",
      },
      {
        name: "Employees",
        short_name: "Employees",
        url: "/app/employees",
      },
    ],
  };
}
