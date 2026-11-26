import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createR2PresignedPutUrl, isR2Configured } from "@/lib/r2";
import { ALLOWED_VIDEO_MIME_EXT, R2_MAX_VIDEO_BYTES } from "@/lib/r2-signer";
import { isRemote } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isRecord } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isRemote()) {
    return NextResponse.json(
      { ok: false, error: "DEMO_MODE", message: "Upload R2 tidak aktif di Mode Demo." },
      { status: 400 }
    );
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "R2_NOT_CONFIGURED",
        message: "Layanan upload video belum dikonfigurasi di server.",
      },
      { status: 503 }
    );
  }

  const { success } = await checkRateLimit(
    `upload-video-url:${getClientIp(request)}`,
    10,
    60000
  );
  if (!success) {
    return NextResponse.json(
      {
        ok: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Terlalu banyak permintaan upload. Coba lagi dalam 1 menit.",
      },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "NEED_LOGIN", message: "Silakan masuk dulu untuk mengunggah video." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY", message: "Payload tidak valid." },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY", message: "Payload tidak valid." },
      { status: 400 }
    );
  }

  const rawContentType =
    typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : "";
  const ext = ALLOWED_VIDEO_MIME_EXT[rawContentType];
  if (!ext) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_VIDEO_TYPE",
        message: "Format video harus MP4, WebM, atau MOV.",
      },
      { status: 400 }
    );
  }

  const fileSize =
    typeof body.fileSize === "number" && Number.isFinite(body.fileSize)
      ? Math.floor(body.fileSize)
      : NaN;
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > R2_MAX_VIDEO_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_VIDEO_SIZE",
        message: "Ukuran video harus antara 1 byte hingga 50 MB.",
      },
      { status: 400 }
    );
  }

  const key = `videos/${user.id}/${crypto.randomUUID()}.${ext}`;
  const { uploadUrl, publicUrl } = createR2PresignedPutUrl({
    key,
    contentType: rawContentType,
    contentLength: fileSize,
    expiresInSeconds: 600,
  });

  return NextResponse.json({
    ok: true,
    uploadUrl,
    publicUrl,
    key,
  });
}
