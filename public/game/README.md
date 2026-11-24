# Aset mini-game Kurir Kado

Latar dan karakter kustom untuk mini-game "Kurir Kado" di landing page.

## Berkas yang aktif

| Nama | Ukuran | Deskripsi |
|---|---|---|
| `kurir.png` | 112×176 | Sprite karakter transparan (tampil 56×88 di game, auto-flip kiri/kanan, bayangan di kaki). |
| `bg.jpg` | 735×412 | Background pixel art paralaks (otomatis tiling horizontal seamless dengan mirror-flip). |

## Penyesuaian

- **Karakter**: Jika ingin mengganti sprite karakter, simpan PNG transparan rasio 1:1.5 s/d 1:2 di `public/game/kurir.png`.
- **Background**: Jika ingin mengganti background, simpan gambar di `public/game/bg.jpg`.
- **Fisika & Level**: Platform, tinggi lompat, dan posisi item diatur di `components/landing/courier/physics.ts`.
