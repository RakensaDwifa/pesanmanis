"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isRemote } from "@/lib/supabase/config";

const REF_KEY = "up_ref_code";
const APPLIED_KEY_PREFIX = "up_ref_applied:";

/**
 * Pasang sekali di layout: menangkap ?ref=CODE dari URL,
 * menyimpannya, dan otomatis meng-apply begitu user login.
 */
export default function CaptureReferral() {
  useEffect(() => {
    if (!isRemote()) return;

    // 1) Tangkap kode dari URL jika ada
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.toUpperCase().startsWith("REF-")) {
      try {
        window.localStorage.setItem(REF_KEY, ref.toUpperCase());
      } catch {
        // ignore
      }
      // Bersihkan param agar tidak terus muncul di URL
      params.delete("ref");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}`
      );
    }

    // 2) Jika ada kode tersimpan dan user sudah/baru login → apply
    let applying = false;
    const tryApplyForUser = async (userId: string) => {
      if (applying) return;
      let stored: string | null = null;
      let alreadyApplied = false;
      const userAppliedKey = `${APPLIED_KEY_PREFIX}${userId}`;
      try {
        stored = window.localStorage.getItem(REF_KEY);
        alreadyApplied = window.localStorage.getItem(userAppliedKey) === "1";
      } catch {
        return;
      }
      if (!stored || alreadyApplied) return;

      applying = true;
      try {
        const res = await fetch("/api/referral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: stored }),
        });
        if (res.ok || res.status === 409) {
          // 200 berhasil atau 409 (sudah pernah referral / kode milik sendiri) → tandai permanen
          window.localStorage.setItem(userAppliedKey, "1");
          window.localStorage.removeItem(REF_KEY);
        } else if (res.status === 404) {
          // Kode tidak ditemukan → hapus kode salah agar user masih bisa memakai kode valid lain
          window.localStorage.removeItem(REF_KEY);
        }
      } catch {
        // ignore
      } finally {
        applying = false;
      }
    };

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) void tryApplyForUser(data.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) void tryApplyForUser(session.user.id);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
