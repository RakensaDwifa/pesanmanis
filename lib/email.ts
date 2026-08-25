import "server-only";
import { Resend } from "resend";
import { BRAND } from "@/lib/brand";

const FROM = `${BRAND.name} <onboarding@resend.dev>`;

function resend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function appBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:0;background:#fff3ea;font-family:Arial,Helvetica,sans-serif;color:#3a241a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff3ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(222,112,56,0.18);">
            <tr>
              <td style="background:linear-gradient(135deg,#de7038,#f5a15a);padding:28px 32px;text-align:center;">
                <div style="font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">🍑 ${BRAND.name}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;color:#de7038;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#fff3ea;text-align:center;font-size:12px;color:#b08a75;">
                ${BRAND.name} — ${BRAND.tagline}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:999px;background:linear-gradient(135deg,#de7038,#f5a15a);"><a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${label}</a></td></tr></table>`;
}

export async function sendPaymentSuccessEmail(input: {
  to: string;
  fromName: string;
  toName: string;
  templateSlug: string;
  ucapanId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = resend();
  if (!client) return { ok: false, error: "RESEND_NOT_CONFIGURED" };

  const url = `${appBaseUrl()}/t/${input.templateSlug}/${input.ucapanId}`;
  const html = layout(
    "Ucapan kamu sudah aktif! 🎉",
    `<p style="margin:0 0 12px;line-height:1.7;">Hai <b>${input.fromName}</b>,</p>
     <p style="margin:0 0 12px;line-height:1.7;">Ucapan untuk <b>${input.toName}</b> sudah aktif dan bisa dibagikan sekarang.</p>
     ${ctaButton(url, "Lihat Ucapanmu 💕")}
     <p style="margin:0;line-height:1.7;font-size:13px;color:#b08a75;">Atau buka link ini: <a href="${url}" style="color:#de7038;">${url}</a></p>`
  );

  const { error } = await client.emails.send({
    from: FROM,
    to: [input.to],
    subject: "Ucapan kamu sudah aktif 🎉",
    html,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function sendAbandonedCartEmail(input: {
  to: string;
  fromName: string;
  toName: string;
  templateSlug: string;
  ucapanId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = resend();
  if (!client) return { ok: false, error: "RESEND_NOT_CONFIGURED" };

  const url = `${appBaseUrl()}/checkout/${input.ucapanId}`;
  const html = layout(
    "Kejutanmu belum selesai 💝",
    `<p style="margin:0 0 12px;line-height:1.7;">Hai <b>${input.fromName}</b>,</p>
     <p style="margin:0 0 12px;line-height:1.7;">Ucapan spesial untuk <b>${input.toName}</b> sudah hampir jadi — tinggal satu langkah pembayaran dan kejutanmu siap dikirim.</p>
     <p style="margin:0 0 12px;line-height:1.7;">Link-nya masih menunggumu. Jangan sampai dia kehabisan momen spesial ya 😉</p>
     ${ctaButton(url, "Selesaikan Kejutanmu 💝")}
     <p style="margin:0;line-height:1.7;font-size:13px;color:#b08a75;">Atau buka link ini: <a href="${url}" style="color:#de7038;">${url}</a></p>`
  );

  const { error } = await client.emails.send({
    from: FROM,
    to: [input.to],
    subject: `Kejutanmu untuk ${input.toName} belum selesai 💝`,
    html,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function sendAdminTransactionEmail(input: {
  to: string;
  fromName: string;
  toName: string;
  templateSlug: string;
  amount: number;
}): Promise<{ ok: boolean; error?: string }> {
  const client = resend();
  if (!client) return { ok: false, error: "RESEND_NOT_CONFIGURED" };

  const html = layout(
    "Transaksi baru 💰",
    `<p style="margin:0 0 12px;line-height:1.7;">Ada transaksi baru di ${BRAND.name}.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff3ea;border-radius:12px;padding:16px;font-size:14px;">
       <tr><td style="padding:4px 0;color:#b08a75;">Dari</td><td style="padding:4px 0;font-weight:bold;text-align:right;">${input.fromName}</td></tr>
       <tr><td style="padding:4px 0;color:#b08a75;">Untuk</td><td style="padding:4px 0;font-weight:bold;text-align:right;">${input.toName}</td></tr>
       <tr><td style="padding:4px 0;color:#b08a75;">Template</td><td style="padding:4px 0;font-weight:bold;text-align:right;">${input.templateSlug}</td></tr>
       <tr><td style="padding:4px 0;color:#b08a75;">Nominal</td><td style="padding:4px 0;font-weight:bold;text-align:right;">Rp ${input.amount.toLocaleString("id-ID")}</td></tr>
     </table>`
  );

  const { error } = await client.emails.send({
    from: FROM,
    to: [input.to],
    subject: `Transaksi baru: ${input.fromName} → ${input.toName} 💰`,
    html,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
