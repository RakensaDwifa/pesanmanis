"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Heart, Loader2, MailCheck, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function LoginFormInner({ remote }: { remote: boolean }) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !remote) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSent(true);
      }
    } catch {
      setErrorMsg("Gagal mengirim link. Coba lagi ya.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!remote) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
      }
    } catch {
      setErrorMsg("Gagal menghubungkan ke Google. Coba lagi ya.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-surface">
      {/* Panel brand — hanya desktop */}
      <div className="hidden lg:flex relative flex-col justify-between p-14 overflow-hidden bg-gradient-to-br from-primary via-[#e8813f] to-[#c85a28]">
        <Heart
          aria-hidden
          className="absolute -top-10 -right-10 h-56 w-56 text-white/10 rotate-12"
          fill="currentColor"
        />
        <Heart
          aria-hidden
          className="absolute bottom-16 -left-14 h-44 w-44 text-white/10 rotate-[-18deg]"
          fill="currentColor"
        />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2 text-white">
            <Heart className="h-6 w-6" fill="currentColor" />
            <span className="font-heading text-2xl italic tracking-tight">{BRAND.name}</span>
          </Link>
        </div>
        <div className="relative max-w-md">
          <h2 className="font-heading text-[42px] leading-tight text-white mb-5">
            {BRAND.tagline}
          </h2>
          <p className="text-body-lg text-white/90 mb-8">
            Semua ucapan yang pernah kamu buat, statistik pembukaannya, dan
            kemudahan edit — ada di satu dashboard.
          </p>
          <div className="space-y-3.5">
            {[
              "Kelola semua ucapan dari satu tempat",
              "Lihat jejak kapan dia membuka link",
              "Bagikan ulang via link atau QR kapan saja",
            ].map((item) => (
              <p key={item} className="flex items-center gap-3 text-body-md text-white/95">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-white/20 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </p>
            ))}
          </div>
        </div>
        <p className="relative text-label-md text-white/70">
          © 2026 {BRAND.name}.com — Dibuat dengan penuh cinta
        </p>
      </div>

      {/* Form */}
      <div className="flex flex-col justify-center px-5 pt-24 pb-24 lg:py-10 lg:px-14 xl:px-20">
        <div className="max-w-md w-full mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-body-md font-semibold text-on-surface-variant hover:text-primary transition-colors mb-5 sm:mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>

          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-5 sm:p-6 md:p-8">
            <h1 className="font-heading text-headline-lg text-primary mb-2">Masuk</h1>
            <p className="text-body-md text-on-surface-variant mb-6">
              Kelola ucapanmu, lihat siapa yang sudah membuka link, dan edit dalam
              masa aktif. Cukup masukkan email — link masuk tanpa password.
            </p>

          {!remote && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/12 p-4 mb-6">
              <p className="text-body-md text-amber-900 dark:text-amber-200">
                Mode demo aktif (Supabase belum terhubung). Login akan tersedia
                setelah konfigurasi lengkap.
              </p>
            </div>
          )}

          {error === "auth" && !sent && (
            <p className="text-body-md text-red-600 dark:text-red-400 mb-4">
              Link masuk tidak valid atau sudah kedaluwarsa. Coba kirim ulang.
            </p>
          )}

          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                <MailCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="font-heading text-title-lg text-on-surface mb-2">
                Cek email kamu 📬
              </h2>
              <p className="text-body-md text-on-surface-variant">
                Link masuk sudah dikirim ke{" "}
                <span className="font-semibold">{email.trim()}</span>. Klik link
                di email untuk masuk ke dashboard.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={loading || !remote}
                className="w-full inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-3.5 bg-surface text-on-surface text-label-lg font-semibold rounded-full border border-outline-variant/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <GoogleLogo />
                )}
                Masuk dengan Google
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-outline-variant/60" />
                <span className="text-label-md text-on-surface-variant">
                  atau lanjut dengan email
                </span>
                <div className="h-px flex-1 bg-outline-variant/60" />
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-label-lg font-semibold text-on-surface mb-1.5"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      className="w-full rounded-2xl border border-outline-variant/80 bg-surface pl-11 pr-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-all"
                      placeholder="kamu@email.com"
                      value={email}
                      disabled={!remote}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                {errorMsg && (
                  <p className="text-body-md text-red-600 dark:text-red-400">{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={loading || !remote}
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-surface-container-low text-on-surface text-label-lg font-semibold rounded-full hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Kirim Link Masuk
                </button>
              </form>

              <p className="text-label-md text-on-surface-variant text-center">
                Tips: gunakan email yang sama saat membuat ucapan agar semua
                muncul di dashboard.
              </p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginForm({ remote }: { remote: boolean }) {
  return (
    <Suspense>
      <LoginFormInner remote={remote} />
    </Suspense>
  );
}
