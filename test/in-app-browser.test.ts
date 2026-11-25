/**
 * test/in-app-browser.test.ts
 *
 * Unit test untuk detectInAppBrowser() di lib/in-app-browser.ts.
 * Dijalankan via: node --test --experimental-strip-types test/in-app-browser.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectInAppBrowser } from "../lib/in-app-browser.ts";

// ---------------------------------------------------------------------------
// User-Agent strings nyata (atau representatif) untuk tiap platform
// ---------------------------------------------------------------------------

const UA_TIKTOK_ANDROID =
  "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "TikTok/26.6.4 Mobile Safari/537.36 BytedanceWebview/d8a21c6";

const UA_TIKTOK_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) musical_ly/30.6.0 Mobile/15E148";

const UA_INSTAGRAM_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Mobile/15E148 Instagram 318.0.0.0.59";

const UA_INSTAGRAM_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; Samsung Galaxy S23) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Instagram/318.0.0.0.59";

const UA_FACEBOOK_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) FBAN/FBIOS;FBDV/iPhone14,2;FBAV/451.0.0.0.60;";

const UA_FACEBOOK_ANDROID =
  "Mozilla/5.0 (Linux; Android 11; SM-A325F) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36 FB_IAB/FB4A;FBAV/451.0.0.0.60;";

const UA_CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

const UA_SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1";

const UA_FIREFOX_ANDROID =
  "Mozilla/5.0 (Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0";

const UA_EDGE_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 EdgiOS/121.0.0.0 Mobile/15E148 Safari/604.1";

const UA_SAMSUNG_BROWSER =
  "Mozilla/5.0 (Linux; Android 13; Samsung Galaxy S22) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("detectInAppBrowser — TikTok", () => {
  it("mendeteksi TikTok Android (BytedanceWebview + TikTok)", () => {
    const result = detectInAppBrowser(UA_TIKTOK_ANDROID);
    assert.equal(result.isInApp, true);
    assert.equal(result.appName, "TikTok");
  });

  it("mendeteksi TikTok iOS (musical_ly)", () => {
    const result = detectInAppBrowser(UA_TIKTOK_IOS);
    assert.equal(result.isInApp, true);
    assert.equal(result.appName, "TikTok");
  });
});

describe("detectInAppBrowser — Instagram", () => {
  it("mendeteksi Instagram iOS", () => {
    const result = detectInAppBrowser(UA_INSTAGRAM_IOS);
    assert.equal(result.isInApp, true);
    assert.equal(result.appName, "Instagram");
  });

  it("mendeteksi Instagram Android (Chrome + Instagram token)", () => {
    const result = detectInAppBrowser(UA_INSTAGRAM_ANDROID);
    assert.equal(result.isInApp, true);
    assert.equal(result.appName, "Instagram");
  });
});

describe("detectInAppBrowser — Facebook", () => {
  it("mendeteksi Facebook iOS (FBAN)", () => {
    const result = detectInAppBrowser(UA_FACEBOOK_IOS);
    assert.equal(result.isInApp, true);
    assert.equal(result.appName, "Facebook");
  });

  it("mendeteksi Facebook Android (FB_IAB)", () => {
    const result = detectInAppBrowser(UA_FACEBOOK_ANDROID);
    assert.equal(result.isInApp, true);
    assert.equal(result.appName, "Facebook");
  });
});

describe("detectInAppBrowser — browser biasa (harus false)", () => {
  it("Chrome Android → isInApp: false", () => {
    const result = detectInAppBrowser(UA_CHROME_ANDROID);
    assert.equal(result.isInApp, false);
    assert.equal(result.appName, null);
  });

  it("Safari iPhone → isInApp: false", () => {
    const result = detectInAppBrowser(UA_SAFARI_IPHONE);
    assert.equal(result.isInApp, false);
    assert.equal(result.appName, null);
  });

  it("Firefox Android → isInApp: false", () => {
    const result = detectInAppBrowser(UA_FIREFOX_ANDROID);
    assert.equal(result.isInApp, false);
    assert.equal(result.appName, null);
  });

  it("Edge iOS → isInApp: false", () => {
    const result = detectInAppBrowser(UA_EDGE_IOS);
    assert.equal(result.isInApp, false);
    assert.equal(result.appName, null);
  });

  it("Samsung Browser → isInApp: false", () => {
    const result = detectInAppBrowser(UA_SAMSUNG_BROWSER);
    assert.equal(result.isInApp, false);
    assert.equal(result.appName, null);
  });
});

describe("detectInAppBrowser — edge cases", () => {
  it("string kosong → isInApp: false, appName: null", () => {
    const result = detectInAppBrowser("");
    assert.equal(result.isInApp, false);
    assert.equal(result.appName, null);
  });

  it("pencocokan case-insensitive (TIKTOK kapital semua)", () => {
    const result = detectInAppBrowser("TIKTOK/26.0 BYTEDANCEWEBVIEW");
    assert.equal(result.isInApp, true);
    assert.equal(result.appName, "TikTok");
  });

  it("prioritas TikTok di atas Instagram bila keduanya ada di UA", () => {
    // Kasus hipotetis: UA mengandung keduanya — TikTok harus menang (urutan prioritas)
    const result = detectInAppBrowser(
      "Mozilla/5.0 TikTok/26.0 BytedanceWebview Instagram/318.0"
    );
    assert.equal(result.isInApp, true);
    assert.equal(result.appName, "TikTok");
  });
});
