import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import Dashboard from "@/components/dashboard/Dashboard";
import { DashboardShellSkeleton } from "@/components/dashboard/DashboardSkeleton";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Kelola ucapan dan pantau kunjungan.",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  let userName: string | undefined;

  if (isRemote()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const meta = user.user_metadata as
      | { full_name?: string; name?: string }
      | undefined;
    const rawName =
      meta?.full_name?.trim() ||
      meta?.name?.trim() ||
      user.email?.split("@")[0];
    if (rawName) {
      userName = rawName;
    }
  }

  return (
    <Suspense fallback={<DashboardShellSkeleton />}>
      <Dashboard userName={userName} />
    </Suspense>
  );
}
