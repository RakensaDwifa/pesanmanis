import "server-only";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";

export type AdminAuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Verifies that the current request belongs to the configured ADMIN_EMAIL account.
 * Shared across all `/api/admin/*` route handlers.
 */
export async function requireAdminUser(): Promise<AdminAuthResult> {
  if (!isRemote()) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 }),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 }),
    };
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "ADMIN_EMAIL_NOT_CONFIGURED" },
        { status: 500 }
      ),
    };
  }

  if ((user.email ?? "").trim().toLowerCase() !== adminEmail) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }),
    };
  }

  return { ok: true, user };
}
