export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoTopic {
  slug: string;
  label: string;
  title: string;
  metaDescription: string;
  heroHeading: string;
  heroSubheading: string;
  recommendedSlugs: string[];
  copyableExamples: {
    label: string;
    text: string;
  }[];
  faqs: SeoFaqItem[];
}

export const SEO_TOPICS: SeoTopic[] = [
  {
    slug: "ulang-tahun-pacar",
    label: "Ucapan Ulang Tahun Pacar",
    title: "Ucapan Ulang Tahun Pacar Web Interaktif — Kado Digital Spesial",
    metaDescription:
      "Buat website ucapan ulang tahun pacar yang romantis & interaktif dalam 5 menit. Lengkap dengan galeri foto, musik latar, countdown buka, dan QR Code.",
    heroHeading: "Ucapan Ulang Tahun Pacar yang Bikin Dia Tersenyum Lama",
    heroSubheading:
      "Daripada cuma kirim chat panjang yang cepat tenggelam, buatkan halaman web ulang tahun berisi foto kenangan, lagu favorit kalian, dan doa terbaik.",
    recommendedSlugs: ["buket-bunga", "kartu-ucapan", "amplop-cinta"],
    copyableExamples: [
      {
        label: "Romantis & Hangat",
        text: "Selamat ulang tahun, sayang. Terima kasih sudah jadi tempat pulang paling nyaman di tengah hari-hariku yang sibuk. Semoga tahun ini membawa lebih banyak tawa kecil, mimpi yang terwujud, dan waktu berdua yang selalu kita syukuri.",
      },
      {
        label: "Manis & Singkat",
        text: "Happy birthday untuk orang yang paling tahu caranya bikin hariku membaik cuma lewat satu senyuman. Sehat selalu, bahagia terus, dan tetap jadi kamu yang aku kenal, ya.",
      },
      {
        label: "Playful & Akrab",
        text: "Selamat bertambah usia, partner paling seru! Semoga rezekinya makin lancar, sabarnya makin luas (terutama menghadapi aku), dan semua rencana baikmu tahun ini satu per satu kejadian.",
      },
    ],
    faqs: [
      {
        question: "Berapa lama membuat website ucapan ulang tahun di PesanManis?",
        answer:
          "Rata-rata hanya sekitar 5 menit. Kamu tinggal pilih template, isi nama serta pesan, unggah foto atau lagu, lalu langsung bayar via QRIS/e-wallet.",
      },
      {
        question: "Bisa dijadwalkan agar baru bisa dibuka tepat jam 00.00 ulang tahunnya?",
        answer:
          "Bisa! Di editor PesanManis tersedia fitur Jadwal Buka (Countdown) gratis. Sebelum jam yang kamu tentukan tiba, penerima akan melihat layar hitung mundur.",
      },
      {
        question: "Apakah link ucapan ulang tahunnya bisa kedaluwarsa?",
        answer:
          "Tidak. PesanManis menggunakan sistem sekali bayar aktif selamanya, dan kamu tetap bisa mengedit isi surat atau foto selama 7 hari setelah pembayaran.",
      },
    ],
  },
  {
    slug: "permintaan-maaf-romantis",
    label: "Surat Permintaan Maaf",
    title: "Surat Permintaan Maaf Romantis & Anti Canggung — Web Interaktif",
    metaDescription:
      "Kirim surat permintaan maaf online yang tulus dan menggemaskan. Ada tombol kabur anti-ngambek, musik penenang, dan laporan keputusan di Dashboard.",
    heroHeading: "Minta Maaf Lebih Tulus Tanpa Terasa Kaku atau Canggung",
    heroSubheading:
      "Kadang chat minta maaf saja belum cukup mencairkan suasana. Kirim halaman permintaan maaf interaktif dengan interaksi tombol menggemaskan yang bikin hatinya pelan-pelan luluh.",
    recommendedSlugs: ["permintaan-maaf", "surat-cinta", "kaca-berembun"],
    copyableExamples: [
      {
        label: "Tulus & Mengakui Kesalahan",
        text: "Aku tahu aku salah dan sikapku kemarin bikin kamu kecewa. Aku nggak mau cari alasan—aku cuma mau minta maaf dengan tulus dan belajar mendengar kamu lebih baik lagi. Boleh kita bicara baik-baik hari ini?",
      },
      {
        label: "Lembut Saat Masih Canggung",
        text: "Maaf ya kalau kata-kataku kemarin sempat melukai perasaanmu. Kamu terlalu berharga buatku untuk dibiarkan sedih sendirian. Kapan pun kamu siap, aku di sini menunggu dengan hati yang terbuka.",
      },
      {
        label: "Ringan & Mencairkan Suasana",
        text: "Halo, orang yang paling aku sayang tapi kadang bikin aku salah tingkah. Aku minta maaf ya atas kejadian kemarin. Jangan marah lama-lama, nanti kangennya numpuk.",
      },
    ],
    faqs: [
      {
        question: "Apa keunikan template Permintaan Maaf di PesanManis?",
        answer:
          "Template Permintaan Maaf memiliki tombol penolakan interaktif yang menggemaskan untuk mencairkan suasana, serta mencatat apakah penerima sudah memaafkan langsung ke Dashboard pengirim.",
      },
      {
        question: "Bisakah saya menambahkan pesan suara agar permintaan maaf terasa lebih personal?",
        answer:
          "Bisa. Kamu dapat mengaktifkan add-on Voice Note untuk merekam suara langsung dari browser atau mengunggah rekaman audio pendek.",
      },
    ],
  },
  {
    slug: "anniversary-interaktif",
    label: "Ucapan Anniversary Digital",
    title: "Ucapan Anniversary Digital untuk Pasangan — Timeline & Galeri Foto",
    metaDescription:
      "Rayakan anniversary dengan website kenangan interaktif: timeline perjalanan cinta, galeri foto, musik latar, dan Struk Cinta yang bisa diunduh.",
    heroHeading: "Simpan Perjalanan Kalian dalam Satu Halaman Anniversary yang Indah",
    heroSubheading:
      "Kumpulkan tanggal-tanggal bersejarah, foto favorit, dan catatan kecil yang belum sempat terucap dalam website ucapan yang aktif selamanya.",
    recommendedSlugs: ["valentine", "botol-kenangan", "kaca-berembun"],
    copyableExamples: [
      {
        label: "Anniversary Pertama",
        text: "Selamat satu tahun bersama! Rasanya baru kemarin kita canggung di obrolan pertama, dan sekarang kamu sudah jadi bagian paling penting di setiap rencanaku. Terima kasih sudah bertahan dan bertumbuh bareng.",
      },
      {
        label: "Anniversary Beberapa Tahun",
        text: "Terima kasih sudah tetap memilih aku di hari-hari mudah maupun hari-hari yang melelahkan. Happy anniversary—semoga langkah kita ke depan tetap searah dan selalu penuh rasa syukur.",
      },
      {
        label: "Puitis & Reflektif",
        text: "Waktu berjalan cepat, tapi bersamamu selalu ada alasan untuk berhenti sejenak dan tersenyum. Selamat hari jadi untuk kita berdua. Mari tulis lebih banyak bab indah setelah ini.",
      },
    ],
    faqs: [
      {
        question: "Fitur apa yang paling cocok untuk ucapan anniversary?",
        answer:
          "Kamu bisa mengisi bagian Timeline Momen Penting (maksimal 12 tanggal bersejarah), mengunggah hingga 10 foto kenangan, serta menambahkan Struk Cinta (Love Receipt) agar bisa disimpan ke galeri HP.",
      },
      {
        question: "Bisakah memakai alamat link dengan nama kami berdua?",
        answer:
          "Ya, pilih add-on Link Cantik agar alamat halaman kalian menjadi pesanmanis.web.id/u/nama-kalian.",
      },
    ],
  },
  {
    slug: "kado-digital-ldr",
    label: "Kado Digital LDR",
    title: "Kado Digital LDR yang Berkesan & Aktif Selamanya — PesanManis",
    metaDescription:
      "Jarak bukan halangan memberi kejutan. Kirim kado digital LDR berupa website surat cinta, pesan suara, foto kenangan, dan kunci PIN rahasia.",
    heroHeading: "Dekatkan Jarak dengan Kado Digital yang Bisa Dibuka Kapan Saja",
    heroSubheading:
      "Saat paket fisik butuh berhari-hari di perjalanan, kejutan digital bisa sampai detik ini juga—lengkap dengan lagu kalian, pesan suara, dan pertanyaan nostalgia berdua.",
    recommendedSlugs: ["kaca-berembun", "botol-kenangan", "amplop-cinta"],
    copyableExamples: [
      {
        label: "Penguat Rindu LDR",
        text: "Meski kota kita dipisahkan jarak dan jam tidur yang kadang berbeda, ingat ya kalau di sini selalu ada satu orang yang mendoakanmu setiap malam. Sebentar lagi kita ketemu, semangat terus di sana!",
      },
      {
        label: "Kejutan Tengah Malam",
        text: "Aku tahu hari-harimu di sana lagi padat-padatnya. Halaman kecil ini aku buat supaya kapan pun kamu capek atau kangen, kamu tinggal buka link ini dan ingat betapa berharganya kamu buatku.",
      },
      {
        label: "Countdown Pertemuan",
        text: "Menghitung hari sampai kita bisa jalan bareng lagi tanpa layar ponsel di antara kita. Jaga kesehatan selalu ya, sayang. Sampai ketemu di pertemuan berikutnya!",
      },
    ],
    faqs: [
      {
        question: "Bagaimana cara agar kejutan LDR terasa makin intim?",
        answer:
          "Aktifkan Kunci PIN / Kuis Nostalgia dengan pertanyaan kenangan kalian berdua, dan tambahkan Voice Note supaya dia bisa langsung mendengar suaramu saat membuka surat.",
      },
      {
        question: "Apakah bisa dibuka di HP penerima tanpa instal aplikasi?",
        answer:
          "Ya, seluruh ucapan PesanManis berjalan langsung di browser HP (Safari, Chrome, Instagram/WhatsApp in-app browser) dengan tampilan mobile-first.",
      },
    ],
  },
  {
    slug: "confess-gebetan",
    label: "Cara Confess ke Gebetan",
    title: "Cara Confess ke Gebetan Lewat Website Interaktif — PesanManis",
    metaDescription:
      "Ungkapkan perasaan ke gebetan dengan cara elegan dan berkesan. Kirim link website ucapan interaktif dengan alur pembuka manis yang nggak bikin awkward.",
    heroHeading: "Ungkapkan Perasaanmu dengan Cara yang Manis & Sulit Dilupakan",
    heroSubheading:
      "Beri dia pengalaman membuka amplop atau mengusap kaca berembun sebelum membaca pengakuan tulusmu—jauh lebih berkesan daripada sekadar teks chat biasa.",
    recommendedSlugs: ["amplop-cinta", "kaca-berembun", "surat-cinta"],
    copyableExamples: [
      {
        label: "Jujur & Elegan",
        text: "Sebenarnya aku sudah cukup lama menyimpan ini. Setiap ngobrol sama kamu, rasanya hari-hariku selalu jadi lebih ringan. Aku nggak memaksa apa pun—aku cuma ingin kamu tahu kalau aku suka sama kamu.",
      },
      {
        label: "Sambil Tersenyum (Light)",
        text: "Kalau kamu sampai membaca halaman ini, berarti aku akhirnya cukup berani buat bilang: aku nyaman banget sama kamu, dan aku ingin mengenalmu lebih jauh lagi.",
      },
      {
        label: "Puitis & Hangat",
        text: "Dari sekian banyak hal yang kebetulan terjadi belakangan ini, mengenal kamu adalah hal yang paling ingin aku jaga baik-baik. Boleh nggak kalau kita jalan bareng minggu ini?",
      },
    ],
    faqs: [
      {
        question: "Apakah saya tahu kalau dia sudah membuka link confess-nya?",
        answer:
          "Ya! Di Dashboard pengirim kamu bisa melihat jumlah kunjungan dan kapan pertama kali link dibuka, plus reaksi emoji atau balasan pesan bila dia mengirimkannya.",
      },
      {
        question: "Template mana yang cocok untuk confess?",
        answer:
          "Amplop Cinta dan Surat Cinta sangat pas untuk kesan manis dan klasik, sedangkan Kaca Berembun cocok kalau ingin suasana sinematik penuh rasa penasaran.",
      },
    ],
  },
  {
    slug: "ucapan-wisuda-sahabat",
    label: "Ucapan Wisuda Web",
    title: "Ucapan Wisuda Web untuk Sahabat & Pasangan — Kado Digital Berkesan",
    metaDescription:
      "Rayakan kelulusan sahabat atau pasangan lewat halaman ucapan wisuda digital berisi foto momen kuliah, pesan bangga, dan QR Code yang bisa dicetak di buket.",
    heroHeading: "Abadikan Momen Kelulusannya dengan Ucapan Wisuda yang Bisa Disimpan",
    heroSubheading:
      "Cetak QR Code dari PesanManis dan selipkan di buket bunga atau kado wisudanya. Saat dipindai, semua foto perjuangan dan ucapan banggamu langsung terbuka.",
    recommendedSlugs: ["buket-bunga", "kartu-ucapan", "botol-kenangan"],
    copyableExamples: [
      {
        label: "Untuk Pasangan yang Baru Lulus",
        text: "Selamat wisuda, hebatku! Aku saksi betapa kerasnya kamu berjuang melewati revisi dan malam-malam panjang itu. Aku bangga banget sama kamu—semoga langkah setelah ini selalu dimudahkan.",
      },
      {
        label: "Untuk Sahabat Dekat",
        text: "Akhirnya toga itu terpasang juga! Selamat lulus ya, bestie. Terima kasih sudah bertahan sejauh ini. Sukses terus di babak barunya, jangan lupa traktirannya!",
      },
      {
        label: "Penuh Doa & Apresiasi",
        text: "Happy graduation! Semua lelah dan begadangmu terbayar manis hari ini. Semoga ilmu yang didapat membawa berkah dan membuka pintu-pintu kesempatan terbaik buat masa depanmu.",
      },
    ],
    faqs: [
      {
        question: "Apakah QR Code ucapan wisuda bisa diunduh dan ditempel di kartu kado fisik?",
        answer:
          "Bisa! Setelah pembayaran selesai, kamu langsung bisa mengunduh kartu QR Code beresolusi tinggi (termasuk pilihan bingkai berbentuk hati/bunga/bintang) untuk dicetak.",
      },
      {
        question: "Bagaimana kalau saya ingin desain wisuda khusus dari nol?",
        answer:
          "Kamu bisa memesan layanan Kado Custom di halaman /custom untuk konsep ilustrasi dan alur cerita khusus.",
      },
    ],
  },
  {
    slug: "valentine-romantis",
    label: "Kartu Ucapan Valentine Digital",
    title: "Kartu Ucapan Valentine Digital & Musik Latar — PesanManis",
    metaDescription:
      "Kirim kartu ucapan Valentine digital interaktif dengan animasi hati, hujan kelopak mawar, musik latar romantis, dan link cantik /u/[nama].",
    heroHeading: "Kirim Kartu Valentine Digital Penuh Cinta dengan Lagu Favorit Kalian",
    heroSubheading:
      "Hadirkan efek kelopak mawar saat layar disentuh, foto kenangan berdua, dan surat cinta berlapis yang bisa disimpan penerima selamanya.",
    recommendedSlugs: ["valentine", "amplop-cinta", "surat-cinta"],
    copyableExamples: [
      {
        label: "Valentine Klasik",
        text: "Happy Valentine's Day, sayang. Terima kasih sudah mencintaiku dengan cara yang tenang dan tulus. Nggak perlu hal mewah—cukup terus ada di sisiku sudah jadi hadiah terbaik.",
      },
      {
        label: "Untuk Pasangan Lama",
        text: "Mungkin kita bukan lagi pasangan yang setiap hari merayakan hal kecil, tapi di hari Valentine ini aku cuma mau mengingatkan: rasa sayangku ke kamu masih sama besarnya seperti dulu, bahkan lebih.",
      },
      {
        label: "Manis & Singkat",
        text: "Selamat hari kasih sayang untuk orang yang bikin hidupku terasa lebih hangat setiap hari. I love you today, tomorrow, and always.",
      },
    ],
    faqs: [
      {
        question: "Bisakah menambahkan efek kelopak mawar atau hati saat layar disentuh?",
        answer:
          "Bisa, cukup aktifkan add-on Efek Partikel Estetik dan pilih varian Hati, Mawar, atau Kilau langsung di Builder.",
      },
      {
        question: "Apakah kartu ucapan bisa dibagikan ke WhatsApp dengan tampilan preview yang rapi?",
        answer:
          "Ya, setiap link PesanManis dilengkapi OpenGraph metadata sehingga saat dibagikan ke WhatsApp akan muncul judul dan kartu pratinjau yang rapi.",
      },
    ],
  },
  {
    slug: "surat-cinta-online",
    label: "Buat Surat Cinta Online",
    title: "Buat Surat Cinta Online dengan Kunci PIN & QR Code — PesanManis",
    metaDescription:
      "Tulis surat cinta online layaknya kertas surat sungguhan lengkap dengan stempel hati, kunci PIN 4-6 digit, musik latar, dan Struk Cinta.",
    heroHeading: "Tulis Surat Cinta Online yang Hangat, Personal, dan Penuh Rahasia",
    heroSubheading:
      "Bukan sekadar teks di catatan HP. Susun surat cinta dengan tema warna mood pilihan, musik pengiring, dan kunci PIN agar hanya dia yang bisa membukanya.",
    recommendedSlugs: ["surat-cinta", "amplop-cinta", "kaca-berembun"],
    copyableExamples: [
      {
        label: "Catatan Hati Malam Hari",
        text: "Ada banyak hal yang sering lupa aku ucapkan langsung saat kita ketemu. Lewat surat kecil ini aku cuma mau bilang: terima kasih sudah sabar menemaniku berproses, dan tetaplah menjadi rumahku.",
      },
      {
        label: "Apresiasi Sederhana",
        text: "Kadang kamu nggak sadar betapa hal-hal kecil yang kamu lakukan bikin hariku jauh lebih berarti. Terima kasih sudah selalu peduli dan ada di saat aku butuh.",
      },
      {
        label: "Surat Cinta Panjang Pembuka",
        text: "Hai kamu yang sedang membaca ini. Tarik napas sebentar, dengarkan lagu yang aku pasang di halaman ini, lalu baca pelan-pelan setiap kata yang sudah aku siapkan khusus untukmu.",
      },
    ],
    faqs: [
      {
        question: "Apakah isi surat cinta saya aman dari orang lain yang menebak link?",
        answer:
          "Jika kamu mengaktifkan add-on Kunci PIN & Kuis Nostalgia, isi surat, foto, dan musik ditahan oleh server dan baru dikirim ke layar setelah penerima memasukkan PIN atau jawaban rahasia dengan benar.",
      },
      {
        question: "Bagaimana sistem pembayarannya?",
        answer:
          "Pembayaran mendukung QRIS, GoPay, ShopeePay, OVO, dan DANA melalui Midtrans. Sekali bayar langsung aktif tanpa biaya langganan bulanan.",
      },
    ],
  },
];

export function getSeoTopic(slug: string): SeoTopic | undefined {
  return SEO_TOPICS.find((t) => t.slug === slug);
}
