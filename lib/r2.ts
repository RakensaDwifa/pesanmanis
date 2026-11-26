import "server-only";

import {
  signR2DeleteRequest,
  signR2PresignedPutUrl,
  type R2Credentials,
} from "./r2-signer";

function readR2Credentials(): R2Credentials | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucketName = process.env.R2_BUCKET_NAME?.trim() ?? "";
  const publicUrl = process.env.R2_PUBLIC_URL?.trim() ?? "";

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: publicUrl.replace(/\/+$/, ""),
  };
}

export function getR2PublicBaseUrl(): string {
  return (process.env.R2_PUBLIC_URL ?? "").trim().replace(/\/+$/, "");
}

export function isR2Configured(): boolean {
  return readR2Credentials() !== null;
}

export function createR2PresignedPutUrl(input: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds?: number;
}): { uploadUrl: string; publicUrl: string } {
  const credentials = readR2Credentials();
  if (!credentials) {
    throw new Error("Cloudflare R2 belum dikonfigurasi");
  }
  return signR2PresignedPutUrl({
    credentials,
    key: input.key,
    contentType: input.contentType,
    contentLength: input.contentLength,
    expiresInSeconds: input.expiresInSeconds ?? 600,
  });
}

/**
 * Deletes one or more object keys from Cloudflare R2.
 * Returns the count of objects deleted (treats 200/204/404 as clean removal).
 */
export async function deleteR2Objects(keys: readonly string[]): Promise<number> {
  const credentials = readR2Credentials();
  if (!credentials || keys.length === 0) return 0;

  let deleted = 0;
  for (const rawKey of keys) {
    const key = rawKey.trim().replace(/^\/+/, "");
    if (!key) continue;
    try {
      const { url, headers } = signR2DeleteRequest(credentials, key);
      const res = await fetch(url, { method: "DELETE", headers });
      if (res.ok || res.status === 404) {
        deleted += 1;
      } else {
        console.warn(`[r2] gagal menghapus objek ${key}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(
        `[r2] error saat menghapus objek ${key}:`,
        err instanceof Error ? err.message : "unknown"
      );
    }
  }
  return deleted;
}
