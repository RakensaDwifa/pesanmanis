import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasValidGateCookie } from "@/lib/gate-cookie";
import { extractUnlockAtFromTimeline } from "@/lib/supabase/rows";
import { isUcapanCountdownLocked } from "@/lib/unlock-schedule";

export type PublicUcapanAccess = "ok" | "not_found" | "locked";

/**
 * Verifies whether the current caller may access a public ucapan's interactive endpoints
 * (reactions, replies, recipient response), enforcing owner-only draft access, countdown
 * unlock schedules, and Intimate Gate unlock cookies.
 */
export async function canAccessPublicUcapan(
  id: string
): Promise<PublicUcapanAccess> {
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("ucapan")
    .select("id, paid, gate_type, owner_id, timeline")
    .eq("id", id)
    .maybeSingle();

  if (!target) return "not_found";

  const isOwner = async (): Promise<boolean> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user && target.owner_id === user.id);
  };

  if (!target.paid) {
    return (await isOwner()) ? "ok" : "not_found";
  }

  const countdownLocked = isUcapanCountdownLocked(
    extractUnlockAtFromTimeline(target.timeline)
  );
  if (countdownLocked) {
    return (await isOwner()) ? "ok" : "locked";
  }

  if (target.gate_type) {
    if (await hasValidGateCookie(id)) return "ok";
    return (await isOwner()) ? "ok" : "locked";
  }

  return "ok";
}
