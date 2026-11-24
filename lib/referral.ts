import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  REFERRAL_REWARD_AMOUNT,
  referralRewardFor,
} from "@/lib/referral-policy";

const REWARD_AMOUNT = REFERRAL_REWARD_AMOUNT;
const RESERVATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h Midtrans Snap expiry window

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i += 1) {
    s += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return `REF-${s}`;
}

/** Ambil kode referral milik user, buat baru jika belum ada. */
export async function getOrCreateReferralCode(
  userId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("referrals")
    .select("code")
    .eq("referrer_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.code) return existing.code;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode();
    const { data, error } = await admin
      .from("referrals")
      .insert({ referrer_id: userId, code, reward_amount: REWARD_AMOUNT })
      .select("code")
      .single();
    if (!error && data?.code) return data.code;
  }
  return null;
}

export interface ReferralStats {
  invited: number;
  completed: number;
  earned: number;
  balance: number;
}

export async function getCreditBalance(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: credits } = await admin
    .from("credits")
    .select("amount")
    .eq("user_id", userId);

  const total = (credits ?? []).reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
  return Math.max(0, total);
}

/**
 * Computes spendable credit balance after subtracting credits already reserved by other
 * active UNPAID payments belonging to the same user (prevents parallel checkout double-spend).
 */
export async function getAvailableCreditBalance(
  userId: string,
  excludeUcapanId?: string
): Promise<number> {
  const totalBalance = await getCreditBalance(userId);
  if (totalBalance <= 0) return 0;

  const admin = createAdminClient();
  const { data: ownedRows } = await admin
    .from("ucapan")
    .select("id")
    .eq("owner_id", userId)
    .eq("paid", false);

  const otherUnpaidIds = (ownedRows ?? [])
    .map((r) => String(r.id))
    .filter((id) => id !== excludeUcapanId);

  if (otherUnpaidIds.length === 0) return totalBalance;

  const cutoff = new Date(Date.now() - RESERVATION_WINDOW_MS).toISOString();
  const { data: pendingPayments, error } = await admin
    .from("payments")
    .select("credit_used")
    .in("ucapan_id", otherUnpaidIds)
    .eq("status", "UNPAID")
    .gt("credit_used", 0)
    .gt("created_at", cutoff);

  if (error) {
    // Graceful fallback if credit_used column hasn't been migrated yet.
    return totalBalance;
  }

  const reserved = (pendingPayments ?? []).reduce(
    (sum, p) => sum + Math.max(0, Number(p.credit_used ?? 0)),
    0
  );
  return Math.max(0, totalBalance - reserved);
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const admin = createAdminClient();

  const { data: refs } = await admin
    .from("referrals")
    .select("id,status,referee_id")
    .eq("referrer_id", userId);

  // Hanya hitung baris yang punya referee_id sebagai teman yang diundang
  const invitedRows = (refs ?? []).filter((r) => Boolean(r.referee_id));
  const completed = invitedRows.filter((r) => r.status === "completed").length;

  const { data: credits } = await admin
    .from("credits")
    .select("amount,type")
    .eq("user_id", userId);

  const earned = (credits ?? [])
    .filter((c) => c.type === "referral" && Number(c.amount ?? 0) > 0)
    .reduce((sum, c) => sum + Number(c.amount ?? 0), 0);

  const balance = Math.max(
    0,
    (credits ?? []).reduce((sum, c) => sum + Number(c.amount ?? 0), 0)
  );

  return {
    invited: invitedRows.filter((r) => r.status !== "expired").length,
    completed,
    earned,
    balance,
  };
}

/**
 * Terapkan kode referral untuk user yang login (sebagai referee).
 * Mendukung multi-invite: jika baris master masih kosong (`referee_id is null`),
 * pakai baris tersebut; jika sudah terisi teman sebelumnya, sisipkan baris baru
 * dengan `code` & `referrer_id` yang sama.
 */
export async function applyReferralCode(
  code: string,
  refereeId: string
): Promise<{ ok: boolean; error?: "INVALID" | "SELF" | "ALREADY_USED" | "DB_ERROR" }> {
  const admin = createAdminClient();
  const normalizedCode = code.trim().toUpperCase();

  // Pastikan referee belum pernah memakai referral sebelumnya
  const { data: alreadyReferred } = await admin
    .from("referrals")
    .select("id")
    .eq("referee_id", refereeId)
    .limit(1)
    .maybeSingle();

  if (alreadyReferred) {
    return { ok: false, error: "ALREADY_USED" };
  }

  // Cari pemilik kode referral
  const { data: codeOwner } = await admin
    .from("referrals")
    .select("id,referrer_id,referee_id,status")
    .eq("code", normalizedCode)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!codeOwner) {
    return { ok: false, error: "INVALID" };
  }
  if (codeOwner.referrer_id === refereeId) {
    return { ok: false, error: "SELF" };
  }

  // Jika baris pertama masih kosong (referee_id null & pending), isi baris itu secara atomik
  if (!codeOwner.referee_id && codeOwner.status === "pending") {
    const { data: updated, error } = await admin
      .from("referrals")
      .update({ referee_id: refereeId })
      .eq("id", codeOwner.id)
      .is("referee_id", null)
      .select("id")
      .maybeSingle();

    if (!error && updated) return { ok: true };
  }

  // Baris pertama sudah terpakai teman lain -> sisipkan baris undangan baru
  const { error: insertErr } = await admin.from("referrals").insert({
    referrer_id: codeOwner.referrer_id,
    referee_id: refereeId,
    code: normalizedCode,
    status: "pending",
    reward_amount: REWARD_AMOUNT,
  });

  if (insertErr) return { ok: false, error: "ALREADY_USED" };
  return { ok: true };
}

/**
 * Selesaikan semua referral pending milik `userId` (dipanggil saat
 * pembayaran pertamanya sukses). Menggunakan klaim atomik `status = 'pending'`
 * + proteksi unique index `credits(user_id, type, reference_id)` agar tidak dobel.
 */
export async function completePendingReferrals(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: pendings } = await admin
    .from("referrals")
    .select("id,referrer_id,reward_amount")
    .eq("referee_id", userId)
    .eq("status", "pending");

  for (const r of pendings ?? []) {
    const now = new Date().toISOString();

    const { count } = await admin
      .from("credits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", r.referrer_id)
      .eq("type", "referral");

    const reward = referralRewardFor(count ?? 0, r.reward_amount);

    // Atomic transition pending -> completed so concurrent callers cannot double-reward.
    const { data: claimed } = await admin
      .from("referrals")
      .update({ status: "completed", completed_at: now, reward_amount: reward })
      .eq("id", r.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (!claimed) continue;

    if (reward > 0) {
      await admin.from("credits").insert({
        user_id: r.referrer_id,
        amount: reward,
        type: "referral",
        reference_id: r.id,
      });
    }
  }
}

/**
 * Potong saldo referral (credits) milik `userId` saat pembayaran lunas.
 * Idempoten terhadap `paymentId` (cek + unique index DB).
 */
export async function redeemCreditsForPayment(
  userId: string,
  paymentId: number,
  creditUsed: number
): Promise<void> {
  if (!userId || creditUsed <= 0 || paymentId <= 0) return;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("credits")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "redeem")
    .eq("reference_id", paymentId)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  await admin.from("credits").insert({
    user_id: userId,
    amount: -Math.abs(creditUsed),
    type: "redeem",
    reference_id: paymentId,
  });
}
