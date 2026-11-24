import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { validateSlugFormat } from "@/lib/slug";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { success } = await checkRateLimit(
    `check-slug:${getClientIp(request)}`,
    30,
    60000
  );
  if (!success) {
    return NextResponse.json(
      {
        available: false,
        normalized: "",
        reason: "Terlalu banyak permintaan. Coba lagi sebentar ya.",
      },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const rawSlug = searchParams.get("slug");
  const ucapanId = searchParams.get("ucapanId");

  if (ucapanId && !isValidUuid(ucapanId)) {
    return NextResponse.json(
      {
        available: false,
        normalized: "",
        reason: "Parameter ucapan tidak valid.",
      },
      { status: 400 }
    );
  }

  const validation = validateSlugFormat(rawSlug);
  if (!validation.valid) {
    return NextResponse.json({
      available: false,
      normalized: validation.normalized,
      reason: validation.reason,
    });
  }

  if (!isRemote()) {
    return NextResponse.json({
      available: true,
      normalized: validation.normalized,
    });
  }

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("ucapan")
      .select("id")
      .eq("custom_slug", validation.normalized)
      .eq("paid", true)
      .limit(1);

    if (ucapanId) {
      query = query.neq("id", ucapanId);
    }

    const { data, error } = await query;
    if (error) {
      // Fail-closed: jangan klaim tersedia jika pengecekan database gagal.
      return NextResponse.json(
        {
          available: false,
          normalized: validation.normalized,
          reason: "Tidak dapat memeriksa ketersediaan alamat saat ini. Coba lagi ya.",
        },
        { status: 503 }
      );
    }

    const exists = Array.isArray(data) && data.length > 0;
    if (exists) {
      return NextResponse.json({
        available: false,
        normalized: validation.normalized,
        reason: "Alamat ini sudah dipakai orang lain. Coba variasi nama lain ya!",
      });
    }

    return NextResponse.json({
      available: true,
      normalized: validation.normalized,
    });
  } catch {
    return NextResponse.json(
      {
        available: false,
        normalized: validation.normalized,
        reason: "Terjadi kesalahan saat memeriksa ketersediaan alamat.",
      },
      { status: 500 }
    );
  }
}
