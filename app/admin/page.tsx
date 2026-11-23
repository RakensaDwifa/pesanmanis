import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { isRemote } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin Control Panel",
  description: "Kelola statistik, transaksi, dan ucapan pengguna.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (isRemote()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) {
      redirect("/dashboard");
    }
  }

  return <AdminDashboard />;
}
