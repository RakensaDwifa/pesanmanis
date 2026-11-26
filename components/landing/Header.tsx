"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Gift, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import Logo from "./Logo";
import { EASE_WARM, SPRING_TACTILE } from "./MotionPrimitives";
import ThemeToggle from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { isRemote } from "@/lib/supabase/config";

const NAV_LINKS = [
  { label: "Cara Kerja", href: "/#cara-kerja" },
  { label: "Fitur", href: "/#fitur" },
  { label: "Template", href: "/#koleksi" },
  { label: "FAQ", href: "/#faq" },
];

export default function Header({
  userEmail: initialEmail,
  userName: initialName,
  userAvatar: initialAvatar,
}: {
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(initialEmail ?? null);
  const [userName, setUserName] = useState<string | null>(initialName ?? null);
  const [userAvatar, setUserAvatar] = useState<string | null>(initialAvatar ?? null);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const hideHeaderCreateCta =
    (pathname?.startsWith("/buat/") || pathname?.startsWith("/dashboard")) ??
    false;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 18);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isRemote() || initialEmail !== undefined) return;
    const supabase = createClient();
    const applyUser = (user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) {
        setUserEmail(null);
        setUserName(null);
        setUserAvatar(null);
        return;
      }
      setUserEmail(user.email ?? null);
      setUserName(
        (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null
      );
      setUserAvatar(
        (user.user_metadata?.avatar_url as string | undefined) ??
          (user.user_metadata?.picture as string | undefined) ??
          null
      );
    };
    supabase.auth.getUser().then(({ data }) => applyUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [initialEmail]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const logout = async () => {
    if (isRemote()) {
      await createClient().auth.signOut();
    }
    router.push("/");
    router.refresh();
  };

  const initial =
    (userName?.trim().charAt(0) ?? userEmail?.trim().charAt(0) ?? "U").toUpperCase();

  const avatar = userAvatar ? (
    <img
      src={userAvatar}
      alt={userName ?? "Profil"}
      className="h-9 w-9 rounded-full object-cover border border-outline-variant"
    />
  ) : (
    <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center text-label-lg font-bold">
      {initial}
    </div>
  );

  return (
    <header
      data-site-chrome
      className={`fixed top-0 w-full z-50 backdrop-blur-md border-b transition-all duration-300 ${
        scrolled
          ? "bg-surface/92 border-outline-variant/25 shadow-[0_6px_24px_rgba(36,25,20,0.08)]"
          : "bg-surface/75 border-surface-container-low shadow-2xs"
      }`}
    >
      <div className="flex justify-between items-center h-20 px-5 lg:px-16 max-w-[1200px] mx-auto">
        <Logo />

        <nav className="hidden lg:flex items-center space-x-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative py-1 text-body-md font-semibold text-on-surface-variant hover:text-primary transition-colors duration-300 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:rounded-full after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          {userEmail ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-label="Menu profil"
                className="flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 hover:bg-primary-fixed/20 transition-colors cursor-pointer"
              >
                {avatar}
                <span className="max-w-[120px] truncate text-body-md font-semibold text-on-surface">
                  {userName ?? userEmail}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-on-surface-variant transition-transform duration-200 ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: EASE_WARM }}
                    className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-surface border border-outline-variant/20 shadow-lg p-2 flex flex-col z-50 origin-top-right"
                  >
                    <div className="px-3 pt-2 pb-3 mb-1 border-b border-outline-variant/20">
                      <p className="text-body-md font-semibold text-on-surface truncate">
                        {userName ?? "Pengguna"}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">{userEmail}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-body-md font-semibold text-on-surface hover:bg-primary-fixed/20 hover:text-primary transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link
                      href="/dashboard/referral"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-body-md font-semibold text-on-surface hover:bg-primary-fixed/20 hover:text-primary transition-colors"
                    >
                      <Gift className="h-4 w-4" /> Referral
                    </Link>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-body-md font-semibold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" /> Keluar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-body-md font-semibold text-on-surface-variant hover:text-primary transition-colors"
            >
              Masuk
            </Link>
          )}
          <ThemeToggle />
          {!hideHeaderCreateCta && (
            <motion.div
              whileHover={{ y: -1.5, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_TACTILE}
            >
              <Link
                href="/templates"
                className="group relative overflow-hidden inline-flex items-center justify-center px-8 py-3.5 bg-primary hover:bg-[#E88048] text-white text-body-md font-semibold rounded-full shadow-[0_4px_14px_0_rgba(222,112,56,0.39)] hover:shadow-[0_8px_22px_rgba(222,112,56,0.34)] transition-all duration-200"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-[420%] transition-transform duration-700 ease-out motion-reduce:hidden"
                />
                <span>Buat Ucapan</span>
              </Link>
            </motion.div>
          )}
        </div>

        <div className="flex lg:hidden items-center gap-1.5">
          {!hideHeaderCreateCta && (
            <motion.div whileTap={{ scale: 0.95 }} transition={SPRING_TACTILE}>
              <Link
                href="/templates"
                className="inline-flex items-center justify-center px-3.5 py-1.5 bg-primary text-white text-xs sm:text-label-md font-semibold rounded-full shadow-xs hover:opacity-95 transition-opacity whitespace-nowrap"
              >
                Buat<span className="hidden min-[380px]:inline">&nbsp;Ucapan</span>
              </Link>
            </motion.div>
          )}
          <ThemeToggle />
          <button
            className="text-on-surface p-2 cursor-pointer"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_WARM }}
            className="lg:hidden overflow-hidden bg-surface border-t border-surface-container-low"
          >
            <div className="px-5 pb-6 pt-2 flex flex-col gap-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-body-md font-semibold text-on-surface-variant hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}

              {userEmail ? (
                <>
                  <div className="flex flex-col pt-3 border-t border-outline-variant/20">
                    <div className="flex items-center gap-3 px-1 py-2.5">
                      {avatar}
                      <div className="min-w-0">
                        <p className="text-body-md font-semibold text-on-surface truncate">
                          {userName ?? "Pengguna"}
                        </p>
                        <p className="text-xs text-on-surface-variant truncate">{userEmail}</p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-1 py-2.5 rounded-xl text-body-md font-semibold text-on-surface hover:text-primary transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link
                      href="/dashboard/referral"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-1 py-2.5 rounded-xl text-body-md font-semibold text-on-surface hover:text-primary transition-colors"
                    >
                      <Gift className="h-4 w-4" /> Referral
                    </Link>
                    <button
                      onClick={() => {
                        setOpen(false);
                        void logout();
                      }}
                      className="flex items-center gap-2 px-1 py-2.5 rounded-xl text-left text-body-md font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" /> Keluar
                    </button>
                  </div>
                </>
              ) : (
                <div className="pt-3 border-t border-outline-variant/20">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="px-1 py-2.5 block text-body-md font-semibold text-on-surface-variant hover:text-primary transition-colors"
                  >
                    Masuk
                  </Link>
                </div>
              )}

              {!hideHeaderCreateCta && (
                <Link
                  href="/templates"
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center justify-center px-6 py-3 bg-primary text-white text-body-md font-semibold rounded-full shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Buat Ucapan
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
