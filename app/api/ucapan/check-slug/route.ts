import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateSlugFormat } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawSlug = searchParams.get("slug");
  const ucapanId = searchParams.get("ucapanId");

  const validation = validateSlugFormat(rawSlug);
  if (!validation.valid) {
    return NextResponse.json({
      available: false,
      normalized: validation.normalized,
      reason: validation.reason,
    });
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from("ucapan")
      .select("id")
      .eq("custom_slug", validation.normalized)
      .limit(1);

    if (ucapanId) {
      query = query.neq("id", ucapanId);
    }

    const { data, error } = await query;
    if (error) {
      // Graceful fallback jika kolom belum dimigrasikan
      return NextResponse.json({
        available: true,
        normalized: validation.normalized,
      });
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
    return NextResponse.json({
      available: true,
      normalized: validation.normalized,
    });
  }
}
