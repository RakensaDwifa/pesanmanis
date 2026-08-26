import type { MoodKey } from "./mood";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  mood?: MoodKey;
  /** Konfirmasi lisensi: semua track di sini royalty-free / CC0 untuk digunakan bebas. */
  license: string;
}

/**
 * Galeri musik berlisensi sah (royalty-free / CC0).
 * Default menggunakan demo track SoundHelix (bebas dipakai).
 * Ganti dengan katalog royalty-free kurasi (mis. buatan sendiri / mixkit / pixabay)
 * sebelum launch agar 100% aman secara lisensi.
 */
export const MUSIC_LIBRARY: MusicTrack[] = [
  {
    id: "helix-1",
    title: "Pelukan Pagi",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    mood: "romantic",
    license: "Royalty-free (SoundHelix)",
  },
  {
    id: "helix-2",
    title: "Langkah Ceria",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    mood: "playful",
    license: "Royalty-free (SoundHelix)",
  },
  {
    id: "helix-3",
    title: "Tenang Bersamamu",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    mood: "calm",
    license: "Royalty-free (SoundHelix)",
  },
  {
    id: "helix-4",
    title: "Senja Jingga",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    mood: "sunset",
    license: "Royalty-free (SoundHelix)",
  },
  {
    id: "helix-5",
    title: "Mimpi Lavender",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    mood: "lavender",
    license: "Royalty-free (SoundHelix)",
  },
  {
    id: "helix-8",
    title: "Detak Romansa",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    mood: "romantic",
    license: "Royalty-free (SoundHelix)",
  },
];
