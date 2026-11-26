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
  if (isRemote()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return (
    <Suspense fallback={<DashboardShellSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
