// Kebijakan reward referral — fungsi murni supaya mudah diuji.
// Dipisah dari lib/referral.ts karena file itu memakai "server-only".

/** Reward per referral yang berhasil (dalam rupiah, sebagai kredit). */
export const REFERRAL_REWARD_AMOUNT = 2000;

/**
 * Batas reward per pengundang. Tanpa batas ini, satu akun bisa
 * mengumpulkan kredit tanpa henti dan menggerus margin.
 */
export const REFERRAL_MAX_REWARDED_PER_REFERRER = 5;

/**
 * Hitung reward yang masih boleh diberikan.
 *
 * @param alreadyRewarded jumlah reward yang sudah pernah diterima pengundang
 * @param configuredReward nilai dari kolom `referrals.reward_amount`
 * @returns nominal reward (0 bila batas tercapai)
 */
export function referralRewardFor(
  alreadyRewarded: number,
  configuredReward?: number | null
): number {
  const rewarded = Number.isFinite(alreadyRewarded) ? Math.max(0, alreadyRewarded) : 0;
  if (rewarded >= REFERRAL_MAX_REWARDED_PER_REFERRER) return 0;

  const amount = Number(configuredReward ?? REFERRAL_REWARD_AMOUNT);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  return Math.floor(amount);
}
