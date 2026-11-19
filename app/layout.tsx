import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import FloatingChat from "@/components/landing/FloatingChat";
import CaptureReferral from "@/components/referral/CaptureReferral";
import { ToasterWrapper } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import { BRAND } from "@/lib/brand";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s — ${BRAND.name}`,
  },
  description: BRAND.description,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let userEmail: string | null = null;
  let userName: string | null = null;
  let userAvatar: string | null = null;
  if (isRemote()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userEmail = user.email ?? null;
      userName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
      userAvatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;
    }
  }

  return (
    <html lang="id" className={`${jakarta.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#de7038" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={BRAND.name} />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script
          dangerouslySetInnerHTML={{
            // Tema + sembunyikan chrome situs di halaman template SEBELUM body dilukis,
            // supaya navbar/footer tidak sempat tampil sebelum transisi bunga jalan.
            __html: `(function(){try{var t=localStorage.getItem("up_theme");var d=t==="dark"||(t===null&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}if(/^\\/(t|preview)\\//.test(location.pathname))document.documentElement.dataset.immersive="1";})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header userEmail={userEmail} userName={userName} userAvatar={userAvatar} />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingChat />
        <CaptureReferral />
        <ToasterWrapper />
        <Analytics />
      </body>
    </html>
  );
}
