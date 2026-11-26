import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: `Kebijakan privasi ${BRAND.name}.`,
  alternates: {
    canonical: "/kebijakan-privasi",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface pt-24 sm:pt-32 pb-24 sm:pb-20">
      <div className="max-w-3xl mx-auto px-5 md:px-16">
        <h1 className="font-heading text-headline-md sm:text-headline-lg text-primary mb-2">
          Kebijakan Privasi
        </h1>
        <p className="text-label-md text-on-surface-variant mb-5 sm:mb-6">
          Terakhir diperbarui: November 2026
        </p>
        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-5 sm:p-8 space-y-4 sm:space-y-5 text-body-md leading-relaxed text-on-surface">
          <p>
            <strong>Data yang kami kumpulkan.</strong> Kami hanya menyimpan informasi yang
            kamu masukkan saat menggunakan layanan: alamat email akun, nama pengirim &amp;
            penerima, isi pesan, foto maupun rekaman audio/pesan suara yang diunggah, serta
            konfigurasi template, jadwal buka, dan add-on.
          </p>
          <p>
            <strong>Keamanan Pesan, Jadwal Buka, &amp; Kunci Rahasia.</strong> Jika kamu
            mengaktifkan fitur Kunci Rahasia (Intimate Gate — PIN atau Kuis Trivia) maupun
            Jadwal Waktu Buka (Countdown), verifikasi dijalankan di server dan isi ucapan,
            foto, serta media tidak dikirim ke publik sebelum jadwal tercapai dan kunci
            dijawab dengan benar.
          </p>
          <p>
            <strong>Pembayaran.</strong> Seluruh transaksi diproses melalui gerbang
            pembayaran resmi (Midtrans). Kami tidak pernah menyimpan nomor kartu kredit/debit,
            PIN perbankan, atau kredensial pembayaranmu.
          </p>
          <p>
            <strong>Statistik, Analitik, &amp; Newsletter.</strong> Kami mencatat jumlah
            dan waktu kunjungan, reaksi emoji, balasan penerima, serta respons interaksi
            ucapan (seperti keputusan pada template Permintaan Maaf) agar dapat kamu
            pantau di Dashboard. Situs juga menggunakan Vercel Analytics dan cookie sesi
            autentikasi/pembuka gerbang yang diperlukan agar fitur berjalan semestinya,
            serta menyimpan email bila kamu mendaftar newsletter atau pengingat checkout.
          </p>
          <p>
            <strong>Penghapusan Data.</strong> Kamu dapat menghapus ucapan kapan saja dari
            halaman Dashboard. Saat ucapan dihapus, foto dan file audio terkait di
            penyimpanan kami ikut dihapus secara otomatis. Draft yang belum dibayar dan
            tidak diperbarui selama lebih dari 21 hari dapat dibersihkan otomatis oleh sistem.
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
