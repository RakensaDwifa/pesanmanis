// Sumber kebenaran tunggal untuk harga ucapan berbayar (PesanManis).
//
// CATATAN: nilai Rp 8.900 masih sementara — perlu dikalkulasi ulang vs
// fee Midtrans (~2,9% + fixed ~Rp4.500) + pajak. Target final ~Rp12.000
// (lihat pesanmanis-plan.md section A/K). Ubah PAID_AMOUNT di satu tempat ini.
//
// Pastikan default kolom `amount` di supabase/schema.sql & schema_v2.sql
// tetap konsisten dengan nilai di sini.

export const PAID_AMOUNT = 8900;

export function formatPrice(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export const PAID_AMOUNT_LABEL = formatPrice(PAID_AMOUNT);
