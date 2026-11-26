import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { NORMAL_AMOUNT_LABEL, PROMO_AMOUNT_LABEL } from "@/lib/pricing";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

export function createBrandOgImageResponse() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #FFF9F5 0%, #FFE3D2 52%, #FFCBB0 100%)",
          padding: "64px 76px",
          fontFamily: "sans-serif",
          color: "#241914",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(222, 112, 56, 0.14)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -90,
            bottom: -140,
            width: 340,
            height: 340,
            borderRadius: "50%",
            background: "rgba(245, 161, 90, 0.18)",
            display: "flex",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: "linear-gradient(135deg, #de7038 0%, #f5a15a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: 32,
                fontWeight: 800,
              }}
            >
              ♥
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: -0.5,
                  color: "#241914",
                }}
              >
                {BRAND.name}
              </span>
              <span style={{ fontSize: 18, color: "#8f3a10", fontWeight: 600 }}>
                {BRAND.domain}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.88)",
              border: "2px solid rgba(222, 112, 56, 0.25)",
              borderRadius: 999,
              padding: "12px 24px",
              fontSize: 22,
              fontWeight: 700,
              color: "#8f3a10",
            }}
          >
            {`Mulai ${PROMO_AMOUNT_LABEL} · Sekali Bayar, Aktif Selamanya`}
          </div>
        </div>

        {/* Center Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 960,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 70,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              color: "#241914",
            }}
          >
            {BRAND.tagline}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.4,
              color: "#55443c",
              fontWeight: 500,
            }}
          >
            Website ucapan digital interaktif — surat cinta, ulang tahun, anniversary,
            hingga permintaan maaf yang bikin dia tersenyum.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            {["Template Interaktif", "Musik & Voice Note", "Link Cantik + QR"].map(
              (pill) => (
                <div
                  key={pill}
                  style={{
                    display: "flex",
                    background: "rgba(255, 255, 255, 0.78)",
                    borderRadius: 999,
                    padding: "10px 20px",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#3e1400",
                  }}
                >
                  {pill}
                </div>
              )
            )}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#867366", fontWeight: 600 }}>
            {`Normal mulai ${NORMAL_AMOUNT_LABEL}`}
          </div>
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE }
  );
}
