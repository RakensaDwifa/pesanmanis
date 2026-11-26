/**
 * Pure AWS Signature Version 4 (SigV4) signer for Cloudflare R2 S3-compatible API.
 * Uses only Node's built-in `node:crypto` — zero external SDK dependencies.
 */

import crypto from "node:crypto";

export const R2_MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
export const ALLOWED_VIDEO_MIME_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const EMPTY_PAYLOAD_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export interface R2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

export interface SignPresignedPutParams {
  credentials: R2Credentials;
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds?: number;
  now?: Date;
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodeS3ObjectKey(key: string): string {
  return key
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeRfc3986)
    .join("/");
}

function formatAmzTimestamps(now: Date): { amzDate: string; dateStamp: string } {
  const iso = now.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  const dateStamp = iso.slice(0, 10).replace(/-/g, "");
  const timeStamp = iso.slice(11, 19).replace(/:/g, "");
  return {
    dateStamp,
    amzDate: `${dateStamp}T${timeStamp}Z`,
  };
}

function deriveSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region = "auto",
  service = "s3"
): Buffer {
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

export function buildR2PublicUrl(publicBaseUrl: string, key: string): string {
  const base = publicBaseUrl.trim().replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");
  return `${base}/${cleanKey}`;
}

/**
 * Generates an AWS SigV4 presigned PUT URL for direct browser-to-R2 uploads.
 * Signs `content-length`, `content-type`, and `host` so R2 rejects size/MIME tampering.
 */
export function signR2PresignedPutUrl(params: SignPresignedPutParams): {
  uploadUrl: string;
  publicUrl: string;
} {
  const {
    credentials,
    key,
    contentType,
    contentLength,
    expiresInSeconds = 600,
    now = new Date(),
  } = params;

  const region = "auto";
  const service = "s3";
  const host = `${credentials.accountId}.r2.cloudflarestorage.com`;
  const cleanKey = key.replace(/^\/+/, "");
  const canonicalUri = `/${encodeRfc3986(credentials.bucketName)}/${encodeS3ObjectKey(cleanKey)}`;

  const { amzDate, dateStamp } = formatAmzTimestamps(now);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const expires = Math.max(60, Math.min(3600, Math.floor(expiresInSeconds)));

  const headerEntries: [string, string][] = [
    ["content-length", String(Math.max(0, Math.floor(contentLength)))],
    ["content-type", contentType.trim()],
    ["host", host],
  ];
  headerEntries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const canonicalHeaders = headerEntries
    .map(([k, v]) => `${k}:${v}\n`)
    .join("");
  const signedHeaders = headerEntries.map(([k]) => k).join(";");

  const queryParams: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${credentials.accessKeyId}/${credentialScope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expires)],
    ["X-Amz-SignedHeaders", signedHeaders],
  ];
  queryParams.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join("&");

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = deriveSigningKey(
    credentials.secretAccessKey,
    dateStamp,
    region,
    service
  );
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  const uploadUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  const publicUrl = buildR2PublicUrl(credentials.publicUrl, cleanKey);

  return { uploadUrl, publicUrl };
}

/**
 * Generates an AWS SigV4 signed DELETE request for removing a single object from R2.
 */
export function signR2DeleteRequest(
  credentials: R2Credentials,
  key: string,
  now: Date = new Date()
): { url: string; headers: Record<string, string> } {
  const region = "auto";
  const service = "s3";
  const host = `${credentials.accountId}.r2.cloudflarestorage.com`;
  const cleanKey = key.replace(/^\/+/, "");
  const canonicalUri = `/${encodeRfc3986(credentials.bucketName)}/${encodeS3ObjectKey(cleanKey)}`;

  const { amzDate, dateStamp } = formatAmzTimestamps(now);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${EMPTY_PAYLOAD_SHA256}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "DELETE",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    EMPTY_PAYLOAD_SHA256,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = deriveSigningKey(
    credentials.secretAccessKey,
    dateStamp,
    region,
    service
  );
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      Host: host,
      "x-amz-content-sha256": EMPTY_PAYLOAD_SHA256,
      "x-amz-date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}
