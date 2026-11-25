/**
 * lib/in-app-browser.ts
 *
 * Pure helper untuk mendeteksi apakah halaman dibuka dari WebView in-app
 * (TikTok, Instagram, Facebook). Tidak ada state, side-effect, atau DOM.
 * Aman dipanggil di SSR (hanya lewat string UA, bukan navigator).
 */

export type InAppBrowserApp = "TikTok" | "Instagram" | "Facebook";

export interface InAppBrowserResult {
  /** true jika UA cocok dengan salah satu in-app browser yang diketahui. */
  isInApp: boolean;
  /** Nama aplikasi yang terdeteksi, atau null jika bukan in-app browser. */
  appName: InAppBrowserApp | null;
}

/**
 * Deteksi WebView in-app berdasarkan string User-Agent.
 *
 * Cocok:
 * - TikTok   : BytedanceWebview · musical_ly · TikTok
 * - Instagram: Instagram
 * - Facebook : FBAN · FBAV · FB_IAB
 *
 * Tidak cocok (selalu false):
 * - Chrome, Safari, Firefox, Edge, Samsung Browser, UC Browser
 */
export function detectInAppBrowser(userAgent: string): InAppBrowserResult {
  if (!userAgent) return { isInApp: false, appName: null };

  const ua = userAgent; // jaga casing asli; regex pakai flag i

  if (/BytedanceWebview|musical_ly|TikTok/i.test(ua)) {
    return { isInApp: true, appName: "TikTok" };
  }

  if (/Instagram/i.test(ua)) {
    return { isInApp: true, appName: "Instagram" };
  }

  if (/FBAN|FBAV|FB_IAB/i.test(ua)) {
    return { isInApp: true, appName: "Facebook" };
  }

  return { isInApp: false, appName: null };
}
