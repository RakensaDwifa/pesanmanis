import { BRAND } from "@/lib/brand";

export const metadata = {
  title: "Syarat & Ketentuan",
  description: `Syarat dan ketentuan penggunaan layanan ${BRAND.name}.`,
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface pt-24 sm:pt-32 pb-24 sm:pb-20">
      <div className="max-w-3xl mx-auto px-5 md:px-16">
        <h1 className="font-heading text-headline-md sm:text-headline-lg text-primary mb-5 sm:mb-6">
          Syarat &amp; Ketentuan Layanan
        </h1>
        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-5 sm:p-8 space-y-4 sm:space-y-5 text-body-md leading-relaxed text-on-surface">
          <p>
            <strong>1. Layanan Produk Digital.</strong> {BRAND.name} menyediakan platform
            pembuatan website ucapan personal interaktif. Setiap transaksi merupakan
            pembelian produk digital sekali bayar (tanpa biaya langganan bulanan).
          </p>
          <p>
            <strong>2. Aktivasi & Masa Edit.</strong> Link ucapan akan langsung aktif
            secara otomatis setelah pembayaran terverifikasi. Pemilik ucapan dapat
            mengubah isi teks, foto, dan musik hingga <strong>7 (tujuh) hari</strong>{" "}
            sejak tanggal pembayaran melalui halaman Dashboard.
          </p>
          <p>
            <strong>3. Kebijakan Pengembalian Dana (Refund).</strong> Karena sifat produk
            digital yang langsung aktif dan dapat diakses seketika setelah pembayaran,
            pembelian yang telah berhasil diaktifkan bersifat final dan tidak dapat
            dibatalkan (non-refundable), kecuali terjadi kegagalan teknis sistem yang
            menyebabkan ucapan tidak dapat diakses sama sekali.
          </p>
          <p>
            <strong>4. Tanggung Jawab Konten.</strong> Pengguna bertanggung jawab penuh
            atas teks, foto, dan tautan yang diunggah. Dilarang mengunggah konten yang
            melanggar hukum, mengandung unsur penipuan, pelecehan, ujaran kebencian,
            atau pelanggaran hak cipta pihak ketiga.
          </p>
          <p>
            <strong>5. Program Referral.</strong> Saldo reward referral diberikan untuk
            undangan pengguna baru yang menyelesaikan transaksi pembayaran pertama
            (maksimal 5 teman per akun pengundang) dan dapat digunakan sebagai potongan
            harga pada checkout berikutnya.
          </p>
          <p>
            <strong>6. Kontak Bantuan.</strong> Jika terdapat kendala pembayaran atau
            pertanyaan terkait layanan, hubungi tim kami melalui email{" "}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="text-primary font-semibold hover:underline"
            >
              {BRAND.contactEmail}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
