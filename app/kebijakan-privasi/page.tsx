import { BRAND } from "@/lib/brand";

export const metadata = {
  title: "Kebijakan Privasi",
  description: `Kebijakan privasi ${BRAND.name}.`,
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface pt-32 pb-20">
      <div className="max-w-3xl mx-auto px-5 md:px-16">
        <h1 className="font-heading text-headline-lg text-primary mb-6">Kebijakan Privasi</h1>
        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-8 space-y-5 text-body-md leading-relaxed text-on-surface">
          <p>
            <strong>Data yang kami kumpulkan.</strong> Kami hanya menyimpan informasi yang
            kamu masukkan saat menggunakan layanan: alamat email akun, nama pengirim &
            penerima, isi pesan, foto yang diunggah, serta konfigurasi template dan add-on.
          </p>
          <p>
            <strong>Keamanan Pesan & PIN Rahasia.</strong> Jika kamu mengaktifkan fitur
            Kunci Rahasia (Intimate Gate), PIN diverifikasi langsung di server dan isi
            ucapan maupun foto tidak dikirim ke publik sebelum PIN yang benar dimasukkan.
          </p>
          <p>
            <strong>Pembayaran.</strong> Seluruh transaksi diproses melalui gerbang
            pembayaran resmi (Midtrans). Kami tidak pernah menyimpan nomor kartu kredit/debit,
            PIN perbankan, atau kredensial pembayaranmu.
          </p>
          <p>
            <strong>Statistik Pembukaan & Interaksi.</strong> Kami mencatat jumlah dan waktu
            saat link ucapan dibuka serta reaksi emoji atau balasan yang dikirim penerima,
            agar kamu dapat melihatnya di halaman Dashboard.
          </p>
          <p>
            <strong>Penghapusan Data.</strong> Kamu dapat menghapus ucapan kapan saja dari
            halaman Dashboard. Saat ucapan dihapus, foto terkait di penyimpanan kami juga
            ikut dihapus secara otomatis.
          </p>
          <p>
            <strong>Kontak Privasi.</strong> Kami tidak menjual data pribadimu ke pihak mana
            pun. Untuk permintaan terkait data pribadi, hubungi{" "}
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
