import { ImageResponse } from "next/og";

import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const alt = "BUSINESSHUB — multi-tenant business operations platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const host = new URL(SITE_URL).host;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0f172a",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            B
          </div>
          <div style={{ display: "flex", color: "#ffffff", fontSize: 30, letterSpacing: 6, fontWeight: 600 }}>
            BUSINESSHUB
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#ffffff", fontSize: 66, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            Run every branch.
          </div>
          <div style={{ display: "flex", color: "#60a5fa", fontSize: 66, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            One controlled system.
          </div>
          <div style={{ display: "flex", color: "#cbd5e1", fontSize: 24, marginTop: 18, maxWidth: 900 }}>
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 21 }}>
          <div style={{ display: "flex" }}>Multi-tenant · Role-based access · Audit-ready</div>
          <div style={{ display: "flex" }}>{host}</div>
        </div>
      </div>
    ),
    size,
  );
}
