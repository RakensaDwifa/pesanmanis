// Matriks fitur per paket (PesanManis).
// Free = permanen + watermark tipis, tanpa musik/video.
// Paid = lepas watermark + musik + video + aktif selamanya.
export const PLANS = {
  free: { id: "free", label: "Free", music: false, video: false, watermark: true },
  paid: { id: "paid", label: "Berbayar", music: true, video: true, watermark: false },
} as const;

export type PlanId = keyof typeof PLANS;

export function planForPaid(paid: boolean) {
  return paid ? PLANS.paid : PLANS.free;
}
